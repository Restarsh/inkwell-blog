import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro max; Hobby caps at 10s.

const POLL_INTERVAL_MS = 2000;
const PRESENCE_HEARTBEAT_MS = 10_000;
const PRESENCE_WINDOW_MS = 30_000;
const PRESENCE_PRUNE_MS = 5 * 60 * 1000;

type RouteContext = { params: Promise<{ id: string }> };

async function countViewers(postId: string): Promise<number> {
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);
  return prisma.postViewer.count({
    where: { postId, lastSeen: { gt: cutoff } },
  });
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let post: { id: string; published: boolean; authorId: string } | null = null;
  try {
    post = await prisma.post.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, published: true, authorId: true },
    });
  } catch (err) {
    console.error("[sse] post lookup failed:", err);
    return new Response("Database unavailable", { status: 503 });
  }

  if (!post) return new Response("Not found", { status: 404 });

  const session = await getSession();
  if (!post.published && session?.sub !== post.authorId) {
    return new Response("Not found", { status: 404 });
  }

  // Each connection gets its own viewer row so multi-tab users don't clash
  // on presence. The counter reflects active readers, not unique accounts.
  const viewerId = randomUUID();
  const postId = post.id;

  // Register presence + prune stale rows opportunistically.
  try {
    await Promise.all([
      prisma.postViewer.upsert({
        where: { postId_viewerId: { postId, viewerId } },
        update: { lastSeen: new Date() },
        create: { postId, viewerId, lastSeen: new Date() },
      }),
      prisma.postViewer.deleteMany({
        where: { lastSeen: { lt: new Date(Date.now() - PRESENCE_PRUNE_MS) } },
      }),
    ]);
  } catch (err) {
    // Presence is best-effort. A failed write must not stop the stream.
    console.error("[sse] presence init failed:", err);
  }

  // Resume from Last-Event-ID if present, otherwise from ?since=, otherwise epoch.
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const headerId = req.headers.get("last-event-id");
  let lastSeenCommentAt = parseSince(headerId) ?? parseSince(sinceParam) ?? new Date(0);

  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let presenceTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown, id?: string) {
        if (closed) return;
        const lines: string[] = [];
        if (id) lines.push(`id: ${id}`);
        lines.push(`event: ${event}`);
        lines.push(`data: ${JSON.stringify(data)}`);
        lines.push("", "");
        try {
          controller.enqueue(encoder.encode(lines.join("\n")));
        } catch {
          closed = true;
        }
      }

      // Initial frame: connection ack + current presence.
      send("connected", { viewerId });
      try {
        send("presence", { count: await countViewers(postId) });
      } catch {
        // Non-fatal; next heartbeat will retry.
      }

      // Comment polling.
      pollTimer = setInterval(async () => {
        if (closed) return;
        try {
          const newComments = await prisma.comment.findMany({
            where: { postId, createdAt: { gt: lastSeenCommentAt } },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: { author: { select: { id: true, name: true } } },
          });

          for (const comment of newComments) {
            send(
              "comment",
              {
                id: comment.id,
                body: comment.body,
                createdAt: comment.createdAt,
                author: comment.author,
              },
              comment.createdAt.toISOString(),
            );
            lastSeenCommentAt = comment.createdAt;
          }
        } catch (err) {
          // Neon suspended, connection pool exhausted, etc. Do not close —
          // the client keeps the connection and the next tick retries.
          console.error("[sse] poll failed:", (err as Error).message);
        }
      }, POLL_INTERVAL_MS);

      // Presence heartbeat.
      presenceTimer = setInterval(async () => {
        if (closed) return;
        try {
          await prisma.postViewer.update({
            where: { postId_viewerId: { postId, viewerId } },
            data: { lastSeen: new Date() },
          });
          send("presence", { count: await countViewers(postId) });
        } catch (err) {
          // Row may have been pruned by a concurrent prune; recreate next tick.
          console.error("[sse] heartbeat failed:", (err as Error).message);
        }
      }, PRESENCE_HEARTBEAT_MS);

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (presenceTimer) clearInterval(presenceTimer);
        try {
          await prisma.postViewer.delete({
            where: { postId_viewerId: { postId, viewerId } },
          });
        } catch {
          // Already gone — fine.
        }
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      req.signal.addEventListener("abort", () => {
        void cleanup();
      });
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (presenceTimer) clearInterval(presenceTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function parseSince(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
