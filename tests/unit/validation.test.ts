import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  postSchema,
  updatePostSchema,
  commentSchema,
} from "@/lib/validation";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.parse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });
    expect(result.email).toBe("ada@example.com");
  });

  it("rejects short password", () => {
    expect(() =>
      registerSchema.parse({ name: "Ada", email: "a@b.co", password: "short" }),
    ).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      registerSchema.parse({ name: "Ada", email: "nope", password: "password123" }),
    ).toThrow();
  });

  it("normalises email to lowercase", () => {
    const result = registerSchema.parse({
      name: "Ada",
      email: "ADA@EXAMPLE.COM",
      password: "password123",
    });
    expect(result.email).toBe("ada@example.com");
  });

  it("trims name whitespace", () => {
    const result = registerSchema.parse({
      name: "  Ada  ",
      email: "ada@example.com",
      password: "password123",
    });
    expect(result.name).toBe("Ada");
  });
});

describe("loginSchema", () => {
  it("rejects empty password", () => {
    expect(() => loginSchema.parse({ email: "a@b.co", password: "" })).toThrow();
  });
});

describe("postSchema", () => {
  it("defaults published to true", () => {
    const result = postSchema.parse({ title: "Hello", content: "World" });
    expect(result.published).toBe(true);
  });

  it("rejects title shorter than 3", () => {
    expect(() => postSchema.parse({ title: "hi", content: "World" })).toThrow();
  });
});

describe("updatePostSchema", () => {
  it("allows partial updates", () => {
    const result = updatePostSchema.parse({ published: false });
    expect(result.published).toBe(false);
    expect(result.title).toBeUndefined();
  });
});

describe("commentSchema", () => {
  it("rejects whitespace-only body", () => {
    expect(() => commentSchema.parse({ body: "   " })).toThrow();
  });

  it("accepts normal body", () => {
    expect(commentSchema.parse({ body: "Nice post" }).body).toBe("Nice post");
  });
});
