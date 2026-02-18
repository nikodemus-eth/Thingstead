import { describe, it, expect } from "vitest";
import { timeAgo } from "./timeAgo.js";

function tsSecsAgo(secs) {
  return new Date(Date.now() - secs * 1000).toISOString();
}

describe("timeAgo", () => {
  it("returns 'never' for null", () => {
    expect(timeAgo(null)).toBe("never");
  });

  it("returns 'never' for undefined", () => {
    expect(timeAgo(undefined)).toBe("never");
  });

  it("returns 'never' for non-string", () => {
    expect(timeAgo(42)).toBe("never");
    expect(timeAgo({})).toBe("never");
  });

  it("returns 'unknown' for invalid date string", () => {
    expect(timeAgo("not-a-date")).toBe("unknown");
    expect(timeAgo("")).toBe("never");
  });

  it("returns 'just now' for timestamp 2 seconds ago", () => {
    expect(timeAgo(tsSecsAgo(2))).toBe("just now");
  });

  it("returns 'just now' for timestamp exactly at threshold (4s ago)", () => {
    expect(timeAgo(tsSecsAgo(4))).toBe("just now");
  });

  it("returns seconds ago for timestamp 30 seconds ago", () => {
    expect(timeAgo(tsSecsAgo(30))).toBe("30s ago");
  });

  it("returns seconds ago for timestamp 59 seconds ago", () => {
    expect(timeAgo(tsSecsAgo(59))).toBe("59s ago");
  });

  it("returns minutes ago for timestamp 5 minutes ago", () => {
    expect(timeAgo(tsSecsAgo(5 * 60))).toBe("5m ago");
  });

  it("returns minutes ago for timestamp 59 minutes ago", () => {
    expect(timeAgo(tsSecsAgo(59 * 60))).toBe("59m ago");
  });

  it("returns hours ago for timestamp 2 hours ago", () => {
    expect(timeAgo(tsSecsAgo(2 * 3600))).toBe("2h ago");
  });

  it("returns hours ago for timestamp 23 hours ago", () => {
    expect(timeAgo(tsSecsAgo(23 * 3600))).toBe("23h ago");
  });

  it("returns days ago for timestamp 3 days ago", () => {
    expect(timeAgo(tsSecsAgo(3 * 86400))).toBe("3d ago");
  });
});
