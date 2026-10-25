"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthFormProps = {
  mode: "login" | "register";
  redirectTo: string;
};

type ApiError = {
  error?: string;
  issues?: Array<{ path: string; message: string }>;
};

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });

      const data: ApiError = await res.json().catch(() => ({}));

      if (!res.ok) {
        const issueText = data.issues?.map((issue) => issue.message).join(" · ");
        setError(issueText || data.error || "Something went wrong. Please try again.");
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {isRegister && (
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="Ada Lovelace"
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
          placeholder={isRegister ? "At least 8 characters" : "••••••••"}
        />
      </div>

      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
      </button>

      <p className="pt-1 text-center text-sm text-slate-600">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
