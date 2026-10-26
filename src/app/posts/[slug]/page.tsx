import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDate, readingTime } from "@/lib/format";
import { CommentsSection } from "@/components/CommentsSection";
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
  if (!post.published && !isAuthor) notFound();

  const paragraphs = post.content.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  const presenceCount = post.published
    ? await prisma.postViewer.count({
        where: {
          postId: post.id,
          lastSeen: { gt: new Date(Date.now() - 30_000) },
        },
      })
    : 0;

  const initialComments = post.comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    author: c.author,
  }));

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
          {post.author.name} ·{" "}
          <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time> ·{" "}
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

      {post.published ? (
        <CommentsSection
          postId={post.id}
          postSlug={post.slug}
          postAuthorId={post.author.id}
          initialComments={initialComments}
          initialPresence={presenceCount}
          currentUserId={session?.sub ?? null}
          currentUserName={session?.name ?? null}
        />
      ) : (
        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold tracking-tight">Comments</h2>
          <p className="mt-4 text-sm text-slate-500">
            Comments are disabled while this post is a draft.
          </p>
        </section>
      )}
    </article>
  );
}
