import Link from "next/link";
import type { SessionPayload } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export function Nav({ user }: { user: SessionPayload | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
          Inkwell
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Posts
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link href="/posts/new" className="btn ml-1 px-3 py-1.5">
                New post
              </Link>
              <span className="mx-2 hidden text-slate-300 sm:inline" aria-hidden>
                |
              </span>
              <span className="hidden max-w-[10rem] truncate text-slate-500 sm:inline">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link href="/register" className="btn ml-1 px-3 py-1.5">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
