import Link from "next/link";
import { formatDate, readingTime } from "@/lib/format";

type PostCardProps = {
  post: {
    id: string;
    slug: string;
    title: string;
    content: string;
    createdAt: Date;
    author: { name: string };
    _count: { comments: number };
  };
};

export function PostCard({ post }: PostCardProps) {
  const plain = post.content.replace(/\s+/g, " ").trim();
  const excerpt = plain.length > 170 ? `${plain.slice(0, 170)}…` : plain;

  return (
    <article className="card p-5 transition hover:border-slate-300 hover:shadow-sm">
      <Link href={`/posts/${post.slug}`} className="group block">
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 transition group-hover:text-blue-600">
          {post.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{excerpt}</p>
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{post.author.name}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
        <span aria-hidden>·</span>
        <span>{readingTime(post.content)}</span>
        <span aria-hidden>·</span>
        <span>
          {post._count.comments} comment{post._count.comments === 1 ? "" : "s"}
        </span>
      </div>
    </article>
  );
}
