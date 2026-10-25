import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Single funnel for route-handler errors.
 *
 * - ZodError       -> 422 with a field-level issue list
 * - UNAUTHORIZED   -> 401
 * - P2002 (unique) -> 409
 * - P2025 (missing)-> 404
 * - anything else  -> 500, logged
 */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return fail("Validation failed", 422, {
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return fail("You must be signed in to do that", 401);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return fail("That value is already taken", 409);
    if (err.code === "P2025") return fail("Not found", 404);
    if (err.code === "P2003") return fail("Related record does not exist", 400);
  }

  console.error("[api] unhandled error:", err);
  return fail("Something went wrong", 500);
}

/** Parse a positive integer query param with a fallback and an upper bound. */
export function intParam(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}
