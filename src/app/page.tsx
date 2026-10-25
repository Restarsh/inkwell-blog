import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 6;

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.PostWhereInput = { published: true };
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const buildHref = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Inkwell</h1>
        <p className="text-sm text-slate-600">
          Notes on building software that holds up. {total} post{total === 1 ? "" : "s"} so far.
        </p>
      </header>

      <form action="/" method="get" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search posts
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search titles and content…"
          className="field"
        />
        <button type="submit" className="btn shrink-0">
          Search
        </button>
      </form>

      {query && (
        <p className="text-sm text-slate-500">
          {total} result{total === 1 ? "" : "s"} for <span className="font-medium text-slate-700">“{query}”</span>.{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            Clear
          </Link>
        </p>
      )}

      {posts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-medium text-slate-700">Nothing here yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            {query ? "Try a different search term." : "The first post is one click away."}
          </p>
          {!query && (
            <Link href="/posts/new" className="btn mt-5">
              Write the first post
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-slate-200 pt-5 text-sm">
          {hasPrev ? (
            <Link href={buildHref(page - 1)} className="btn-ghost">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          {hasNext ? (
            <Link href={buildHref(page + 1)} className="btn-ghost">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
