import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "Inkwell — a small blog",
    template: "%s · Inkwell",
  },
  description:
    "A full-stack blog built with Next.js, Prisma and PostgreSQL. Posts, comments, and cookie-based auth.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Nav user={session} />
        <main className="mx-auto w-full max-w-3xl px-4 py-10">{children}</main>
        <footer className="mx-auto w-full max-w-3xl border-t border-slate-200 px-4 py-6 text-xs text-slate-400">
          Inkwell · Next.js + Prisma + PostgreSQL
        </footer>
      </body>
    </html>
  );
}
