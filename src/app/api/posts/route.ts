import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validation";
import { requireSession } from "@/lib/auth";
import { uniqueSlug } from "@/lib/posts";
import { fail, handleError, intParam, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/posts?page=1&limit=10&q=term&authorId=...
 * Public — returns published posts only.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = intParam(searchParams.get("page"), 1, 10_000);
    const limit = intParam(searchParams.get("limit"), 10, 50);
    const q = searchParams.get("q")?.trim() ?? "";
    const authorId = searchParams.get("authorId")?.trim() ?? "";

    const where: Prisma.PostWhereInput = { published: true };
    if (authorId) where.authorId = authorId;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return ok({
      items,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/posts — create a post. Requires a session. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const data = postSchema.parse(await req.json());

    const slug = await uniqueSlug(data.title);

    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        published: data.published,
        slug,
        authorId: session.sub,
      },
      select: { id: true, slug: true, title: true, published: true, createdAt: true },
    });

    return ok({ post }, 201);
  } catch (err) {
    // A concurrent create could beat the slug check; uniqueSlug retries, but
    // if the constraint still fires we surface a clean 409 from handleError.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("That title is already taken. Try a slightly different one.", 409);
    }
    return handleError(err);
  }
}
