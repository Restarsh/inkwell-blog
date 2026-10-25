"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteButtonProps = {
  endpoint: string;
  label?: string;
  confirmText?: string;
  redirectTo?: string;
  compact?: boolean;
};

export function DeleteButton({
  endpoint,
  label = "Delete",
  confirmText = "Are you sure? This cannot be undone.",
  redirectTo,
  compact = false,
}: DeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(confirmText)) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed.");
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={compact ? "rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60" : "btn-danger"}
        aria-label={label}
      >
        {pending ? "…" : label}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}
