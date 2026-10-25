import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });

    if (!user) return fail("Account no longer exists", 401);

    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
