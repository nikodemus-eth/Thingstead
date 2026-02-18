// @vitest-environment node
import { describe, it, expect } from "vitest";
import { shouldAcceptWrite } from "../../server/conflict.mjs";

describe("shouldAcceptWrite", () => {
  it("accepts when no existing project", () => {
    expect(shouldAcceptWrite(null, "2026-01-01T00:00:00.000Z")).toBe(true);
  });

  it("accepts when incoming is newer", () => {
    expect(shouldAcceptWrite(
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z"
    )).toBe(true);
  });

  it("accepts when timestamps are equal", () => {
    expect(shouldAcceptWrite(
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    )).toBe(true);
  });

  it("accepts within 2-second tolerance window", () => {
    expect(shouldAcceptWrite(
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:00.500Z"
    )).toBe(true);
  });

  it("rejects when incoming is significantly older", () => {
    expect(shouldAcceptWrite(
      "2026-01-02T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    )).toBe(false);
  });

  it("accepts when existing timestamp is unparseable", () => {
    expect(shouldAcceptWrite("not-a-date", "2026-01-01T00:00:00.000Z")).toBe(true);
  });

  it("accepts when incoming timestamp is unparseable", () => {
    expect(shouldAcceptWrite("2026-01-01T00:00:00.000Z", "not-a-date")).toBe(true);
  });
});
