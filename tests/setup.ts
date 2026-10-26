import { vi } from "vitest";

// auth.ts imports `cookies` from "next/headers", which requires a request
// context. Mocking it here lets unit tests import the module safely without
// pulling in Next.js internals.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: () => undefined,
    delete: () => undefined,
  })),
}));

// Deterministic secret for token signing tests. Must be >= 32 chars.
process.env.JWT_SECRET = "unit-test-secret-at-least-32-characters-long";
