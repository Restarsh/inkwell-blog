import { describe, it, expect } from "vitest";
import { formatDate, readingTime } from "@/lib/format";

describe("formatDate", () => {
  it("formats in UTC", () => {
    expect(formatDate(new Date("2026-01-15T00:00:00Z"))).toBe("Jan 15, 2026");
  });

  it("does not shift across midnight UTC", () => {
    expect(formatDate(new Date("2026-12-31T23:30:00Z"))).toBe("Dec 31, 2026");
  });
});

describe("readingTime", () => {
  it("returns at least 1 minute", () => {
    expect(readingTime("hello")).toBe("1 min read");
    expect(readingTime("")).toBe("1 min read");
  });

  it("scales with word count", () => {
    const twoMin = Array.from({ length: 440 }, () => "word").join(" ");
    expect(readingTime(twoMin)).toBe("2 min read");
  });
});
