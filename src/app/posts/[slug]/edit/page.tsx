import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PostForm } from "@/components/PostForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit post" };

type Params = Promise<{ slug: string }>;

export default async function EditPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/posts/${slug}/edit`);

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, title: true, content: true, published: true, authorId: true },
  });

  if (!post) notFound();
  // Ownership check happens here, not in middleware.
  if (post.authorId !== session.sub) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/posts/${slug}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to post
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit post</h1>
        <p className="mt-1 text-sm text-slate-600">
          The URL stays at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/{slug}</code>{" "}
          so existing links keep working.
        </p>
      </div>

      <PostForm
        mode="edit"
        postId={post.id}
        initial={{ title: post.title, content: post.content, published: post.published }}
      />
    </div>
  );
}
