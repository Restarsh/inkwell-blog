import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only allow same-origin relative paths — prevents open-redirect abuse.
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to write and comment.</p>
      <div className="mt-8">
        <AuthForm mode="login" redirectTo={redirectTo} />
      </div>
    </div>
  );
}
