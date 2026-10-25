import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePostSchema } from "@/lib/validation";
import { getSession, requireSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Accepts either a cuid or a slug. */
function lookup(idOrSlug: string) {
  return { OR: [{ id: idOrSlug }, { slug: idOrSlug }] };
}

/** GET /api/posts/:idOrSlug — public for published posts, author-only for drafts. */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const post = await prisma.post.findFirst({
      where: lookup(id),
      include: {
        author: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    if (!post) return fail("Post not found", 404);

    if (!post.published) {
      const session = await getSession();
      if (session?.sub !== post.author.id) return fail("Post not found", 404);
    }

    return ok({ post });
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH /api/posts/:idOrSlug — partial update, author only. */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const data = updatePostSchema.parse(await req.json());

    const existing = await prisma.post.findFirst({
      where: lookup(id),
      select: { id: true, authorId: true },
    });

    if (!existing) return fail("Post not found", 404);
    if (existing.authorId !== session.sub) return fail("You can only edit your own posts", 403);

    const post = await prisma.post.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
      },
      select: { id: true, slug: true, title: true, published: true, updatedAt: true },
    });

    return ok({ post });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/posts/:idOrSlug — author only. Cascades comments. */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const existing = await prisma.post.findFirst({
      where: lookup(id),
      select: { id: true, authorId: true },
    });

    if (!existing) return fail("Post not found", 404);
    if (existing.authorId !== session.sub) {
      return fail("You can only delete your own posts", 403);
    }

    await prisma.post.delete({ where: { id: existing.id } });

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
