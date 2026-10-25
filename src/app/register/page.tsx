import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1 text-sm text-slate-600">Takes about ten seconds.</p>
      <div className="mt-8">
        <AuthForm mode="register" redirectTo="/dashboard" />
      </div>
    </div>
  );
}
