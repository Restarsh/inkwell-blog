import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/comments/:id
 *
 * Allowed for the comment's author and for the author of the parent post
 * (so post owners can moderate their own threads).
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true, post: { select: { authorId: true } } },
    });

    if (!comment) return fail("Comment not found", 404);

    const isCommentAuthor = comment.authorId === session.sub;
    const isPostAuthor = comment.post.authorId === session.sub;

    if (!isCommentAuthor && !isPostAuthor) {
      return fail("You can only delete your own comments", 403);
    }

    await prisma.comment.delete({ where: { id: comment.id } });

    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
