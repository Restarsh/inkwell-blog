"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not post your comment.");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <label htmlFor="comment" className="sr-only">
        Your comment
      </label>
      <textarea
        id="comment"
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add to the discussion…"
        className="field resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{body.length}/2000</span>
        <button type="submit" disabled={pending || !body.trim()} className="btn px-4 py-1.5">
          {pending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}
