import { describe, it, expect } from "vitest";
import { emailLinkOrigin, safeNextPath } from "./redirect";

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

describe("emailLinkOrigin — sign-up emails link back to this site, not localhost", () => {
  it("uses a configured public URL", () => {
    expect(emailLinkOrigin("https://kitchen-os.mcabello.dev/", "whatever.app", "https")).toBe("https://kitchen-os.mcabello.dev");
  });

  it("ignores a configured localhost and uses the site the request came to", () => {
    expect(emailLinkOrigin("http://localhost:3000", "kitchen-os.mcabello.dev", "https")).toBe("https://kitchen-os.mcabello.dev");
    expect(emailLinkOrigin(undefined, "kitchen-os.mcabello.dev", null)).toBe("https://kitchen-os.mcabello.dev");
  });

  it("keeps http for local and LAN dev, so a phone on the same Wi-Fi works", () => {
    expect(emailLinkOrigin(undefined, "192.168.178.164:3000", null)).toBe("http://192.168.178.164:3000");
    expect(emailLinkOrigin(undefined, "localhost:3000", null)).toBe("http://localhost:3000");
  });

  it("never builds an origin from a malformed Host header", () => {
    expect(emailLinkOrigin(undefined, "evil.com/path", "https")).toBe("http://localhost:3000");
    expect(emailLinkOrigin(undefined, "kitchen-os.mcabello.dev", "javascript")).toBe("https://kitchen-os.mcabello.dev");
  });
});
