"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  async function handleLogout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      setError(true);
      return;
    }
    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-lg px-3 py-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
      title={error ? "Sign out failed — try again" : "Sign out"}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
