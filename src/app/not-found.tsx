import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-slate-400">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The post may have been deleted, or it might still be a draft.
      </p>
      <Link href="/" className="btn mt-6">
        Back to all posts
      </Link>
    </div>
  );
}
