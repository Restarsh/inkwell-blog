import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const posts = await prisma.post.findMany({
    where: { authorId: session.sub },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comments: true } } },
  });

  const published = posts.filter((p) => p.published).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your posts</h1>
          <p className="mt-1 text-sm text-slate-600">
            {posts.length} total · {published} published · {posts.length - published} draft
            {posts.length - published === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/posts/new" className="btn">
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No posts yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Your dashboard is where drafts live before they go public.
          </p>
          <Link href="/posts/new" className="btn mt-5">
            Write your first post
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-slate-200">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/posts/${post.slug}`}
                    className="truncate font-medium text-slate-900 hover:text-blue-600"
                  >
                    {post.title}
                  </Link>
                  <span
                    className={
                      post.published
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                        : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                    }
                  >
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(post.createdAt)} · {post._count.comments} comment
                  {post._count.comments === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/posts/${post.slug}/edit`} className="btn-ghost px-3 py-1.5">
                  Edit
                </Link>
                <DeleteButton
                  endpoint={`/api/posts/${post.id}`}
                  confirmText={`Delete “${post.title}”? This also removes its comments.`}
                  label="Delete"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
