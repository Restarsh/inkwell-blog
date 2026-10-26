"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
};

type CommentsSectionProps = {
  postId: string;
  postSlug: string;
  postAuthorId: string;
  initialComments: Comment[];
  initialPresence: number;
  currentUserId: string | null;
  currentUserName: string | null;
};

function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function CommentsSection({
  postId,
  postSlug,
  postAuthorId,
  initialComments,
  initialPresence,
  currentUserId,
  currentUserName,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [presence, setPresence] = useState(initialPresence);
  const [connected, setConnected] = useState(false);

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const latest = initialComments[0]?.createdAt ?? new Date(0).toISOString();
    const url = `/api/posts/${postId}/comments/stream?since=${encodeURIComponent(latest)}`;
    const es = new EventSource(url);

    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));

    es.addEventListener("comment", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as Comment;
        setComments((prev) => {
          if (prev.some((c) => c.id === data.id)) return prev;
          return [data, ...prev];
        });
      } catch {
        // Malformed event — ignore.
      }
    });

    es.addEventListener("presence", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as { count: number };
        if (typeof data.count === "number") setPresence(data.count);
      } catch {
        // Malformed event — ignore.
      }
    });

    return () => {
      es.close();
    };
    // initialComments is intentionally excluded: we only want the very first
    // value for the ?since= seed, not every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || posting) return;

    setPosting(true);
    setError(null);

    const tempId = `tmp_${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      author: { id: currentUserId ?? "anon", name: currentUserName ?? "You" },
    };

    setComments((prev) => [optimistic, ...prev]);
    setBody("");

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setBody(text);
        setError(typeof data.error === "string" ? data.error : "Could not post your comment.");
        return;
      }

      const real = data.comment as Comment;
      setComments((prev) => {
        const filtered = prev.filter((c) => c.id !== tempId);
        if (filtered.some((c) => c.id === real.id)) return filtered;
        return [real, ...filtered];
      });
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setBody(text);
      setError("Network error. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Could not delete comment.");
      }
    } catch {
      setError("Network error.");
    }
  }

  return (
    <section className="border-t border-slate-200 pt-6" data-connected={connected ? "true" : "false"}>
      <h2 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold tracking-tight">
        <span>
          Comments <span className="text-sm font-normal text-slate-500">({comments.length})</span>
        </span>
        {presence > 1 && (
          <span className="text-xs font-normal text-slate-400">· {presence} reading</span>
        )}
        {!connected && (
          <span className="text-xs font-normal text-amber-600" title="Stream disconnected">
            · reconnecting
          </span>
        )}
      </h2>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label htmlFor="comment" className="sr-only">
            Your comment
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add to the discussion…"
            className="field resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{body.length}/2000</span>
            <button type="submit" disabled={posting || !body.trim()} className="btn px-4 py-1.5">
              {posting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <Link
            href={`/login?next=/posts/${postSlug}`}
            className="font-medium text-blue-600 hover:underline"
          >
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {comments.map((comment) => {
            const isOptimistic = comment.id.startsWith("tmp_");
            const canDelete =
              !isOptimistic &&
              (currentUserId === comment.author.id || currentUserId === postAuthorId);
            const isPostAuthorComment = comment.author.id === postAuthorId;
            return (
              <li
                key={comment.id}
                className={`card p-4 ${isOptimistic ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {comment.author.name}
                      {isPostAuthorComment && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
                          Author
                        </span>
                      )}
                      {isOptimistic && (
                        <span className="ml-2 text-[10px] text-slate-400">sending…</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(comment.createdAt)}</p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
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
  );
}
