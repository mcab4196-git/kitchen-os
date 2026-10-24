import { describe, it, expect } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath — no open redirect from the auth callback (N3)", () => {
  it("keeps same-site paths, with their query and hash", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/inventory?filter=soon#top")).toBe("/inventory?filter=soon#top");
  });

  it("falls back for anything that could leave the site", () => {
    for (const bad of [".evil.com", "@evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "evil.com"]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });

  it("falls back when there's no next, and honours a custom fallback", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath("//evil.com", "/login")).toBe("/login");
  });
});
