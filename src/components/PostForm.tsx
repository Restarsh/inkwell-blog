"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PostFormProps = {
  mode: "create" | "edit";
  postId?: string;
  initial?: { title: string; content: string; published: boolean };
};

type ApiError = {
  error?: string;
  issues?: Array<{ path: string; message: string }>;
};

export function PostForm({ mode, postId, initial }: PostFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [published, setPublished] = useState(initial?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEdit = mode === "edit";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const endpoint = isEdit ? `/api/posts/${postId}` : "/api/posts";
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, published }),
      });

      const data: ApiError & { post?: { slug: string } } = await res.json().catch(() => ({}));

      if (!res.ok) {
        const issueText = data.issues?.map((issue) => issue.message).join(" · ");
        setError(issueText || data.error || "Could not save the post.");
        return;
      }

      router.push(isEdit ? "/dashboard" : `/posts/${data.post?.slug ?? ""}`);
      router.refresh();
    } catch {
      setError("Network error. Your draft is still in the form — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="label">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field text-base"
          placeholder="What is this post about?"
        />
        <p className="mt-1 text-xs text-slate-400">{title.length}/120</p>
      </div>

      <div>
        <label htmlFor="content" className="label">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={16}
          maxLength={20000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="field resize-y font-mono text-[13px] leading-6"
          placeholder={"Write in plain text.\n\nLeave a blank line between paragraphs."}
        />
        <p className="mt-1 text-xs text-slate-400">
          {content.length}/20,000 · blank lines become paragraphs
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800">Published</span>
          <span className="block text-xs text-slate-500">
            When unchecked, only you can see this post.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Saving…" : isEdit ? "Save changes" : published ? "Publish post" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
