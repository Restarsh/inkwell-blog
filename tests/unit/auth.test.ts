import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";

describe("passwords", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("password123");
    expect(hash).not.toBe("password123");
    expect(await verifyPassword("password123", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("password123");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces distinct hashes for the same plaintext", async () => {
    const [a, b] = await Promise.all([
      hashPassword("password123"),
      hashPassword("password123"),
    ]);
    expect(a).not.toBe(b);
  });
});

describe("session tokens", () => {
  it("signs and verifies a round-trip", async () => {
    const token = await createSessionToken({
      sub: "user-1",
      email: "a@b.co",
      name: "Test User",
    });
    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-1");
    expect(payload?.email).toBe("a@b.co");
    expect(payload?.name).toBe("Test User");
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({
      sub: "user-1",
      email: "a@b.co",
      name: "Test User",
    });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects empty input", async () => {
    expect(await verifySessionToken("")).toBeNull();
  });

  it("rejects arbitrary strings", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });
});
