import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PostForm } from "@/components/PostForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/posts/new");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New post</h1>
        <p className="mt-1 text-sm text-slate-600">
          Uncheck “Publish” to keep it as a draft only you can see.
        </p>
      </div>
      <PostForm mode="create" />
    </div>
  );
}
