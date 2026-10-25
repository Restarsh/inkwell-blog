import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validation";
import { requireSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function findPost(idOrSlug: string) {
  return prisma.post.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, published: true },
  });
}

/** GET /api/posts/:idOrSlug/comments */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const post = await findPost(id);
    if (!post) return fail("Post not found", 404);

    const comments = await prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    });

    return ok({ comments, total: comments.length });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/posts/:idOrSlug/comments — requires a session. */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { body } = commentSchema.parse(await req.json());

    const post = await findPost(id);
    if (!post) return fail("Post not found", 404);
    if (!post.published) return fail("Comments are closed on drafts", 403);

    const comment = await prisma.comment.create({
      data: { body, postId: post.id, authorId: session.sub },
      include: { author: { select: { id: true, name: true } } },
    });

    return ok({ comment }, 201);
  } catch (err) {
    return handleError(err);
  }
}
