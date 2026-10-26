import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips accents", () => {
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
  });

  it("collapses runs of non-alphanumerics", () => {
    expect(slugify("foo!!!bar")).toBe("foo-bar");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  it("caps length at 60", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });

  it("falls back to 'post' for empty input", () => {
    expect(slugify("")).toBe("post");
    expect(slugify("!!!")).toBe("post");
  });
});
