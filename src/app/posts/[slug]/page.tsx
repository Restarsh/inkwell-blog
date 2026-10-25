import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDate, readingTime } from "@/lib/format";
import { CommentForm } from "@/components/CommentForm";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function loadPost(slug: string) {
  return prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, content: true },
  });
  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    description: post.content.replace(/\s+/g, " ").slice(0, 155),
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [post, session] = await Promise.all([loadPost(slug), getSession()]);

  if (!post) notFound();

  const isAuthor = session?.sub === post.author.id;
  // Drafts are visible to their author only.
  if (!post.published && !isAuthor) notFound();

  const paragraphs = post.content.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← All posts
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900">
            {post.title}
          </h1>
          {!post.published && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Draft
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500">
          {post.author.name} · <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time> ·{" "}
          {readingTime(post.content)}
        </p>

        {isAuthor && (
          <div className="flex items-center gap-2 pt-1">
            <Link href={`/posts/${post.slug}/edit`} className="btn-ghost px-3 py-1.5">
              Edit
            </Link>
            <DeleteButton
              endpoint={`/api/posts/${post.id}`}
              label="Delete"
              redirectTo="/dashboard"
              confirmText="Delete this post and all of its comments?"
            />
          </div>
        )}
      </header>

      <div className="border-t border-slate-200 pt-6">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700 first:mt-0"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Comments{" "}
          <span className="text-sm font-normal text-slate-500">({post.comments.length})</span>
        </h2>

        {post.published ? (
          session ? (
            <div className="mt-4">
              <CommentForm postId={post.id} />
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <Link
                href={`/login?next=/posts/${post.slug}`}
                className="font-medium text-blue-600 hover:underline"
              >
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          )
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Comments are disabled while this post is a draft.
          </p>
        )}

        {post.comments.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">No comments yet.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {post.comments.map((comment) => {
              const canDelete = session?.sub === comment.author.id || isAuthor;
              return (
                <li key={comment.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {comment.author.name}
                        {isAuthor && comment.author.id === post.author.id && (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
                            Author
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(comment.createdAt)}</p>
                    </div>
                    {canDelete && (
                      <DeleteButton
                        endpoint={`/api/comments/${comment.id}`}
                        label="Delete"
                        confirmText="Delete this comment?"
                        compact
                      />
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {comment.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
