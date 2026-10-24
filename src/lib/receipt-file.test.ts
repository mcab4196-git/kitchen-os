import { describe, it, expect } from "vitest";
import { fitWithin, sniffReceiptType, receiptFileProblem, MAX_RECEIPT_BYTES } from "./receipt-file";

const bytes = (...xs: (number | string)[]) =>
  new Uint8Array(xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("fitWithin — shrink photos before upload (N1)", () => {
  it("scales the longest edge down to the limit, keeping the ratio", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never scales a small image up", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });
});

describe("sniffReceiptType — trust the bytes, not the label (S6)", () => {
  it("recognises JPEG, PNG, WebP and PDF by their signatures", () => {
    expect(sniffReceiptType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffReceiptType(bytes(0x89, "PNG\r\n\x1a\n", 0))).toBe("image/png");
    expect(sniffReceiptType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("image/webp");
    expect(sniffReceiptType(bytes("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("rejects anything else, including a renamed file and too-short input", () => {
    expect(sniffReceiptType(bytes("<html><script>"))).toBeNull();
    expect(sniffReceiptType(bytes("GIF89a"))).toBeNull();
    expect(sniffReceiptType(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffReceiptType(new Uint8Array())).toBeNull();
  });
});

describe("receiptFileProblem", () => {
  it("accepts a known type within the limit", () => {
    expect(receiptFileProblem(350_000, "image/jpeg")).toBeNull();
    expect(receiptFileProblem(MAX_RECEIPT_BYTES, "application/pdf")).toBeNull();
  });

  it("explains empty, unknown and oversized files", () => {
    expect(receiptFileProblem(0, "image/jpeg")).toMatch(/empty/);
    expect(receiptFileProblem(1000, null)).toMatch(/JPEG, PNG, WebP or PDF/);
    expect(receiptFileProblem(MAX_RECEIPT_BYTES + 1, "application/pdf")).toMatch(/PDF is over 4 MB/);
    expect(receiptFileProblem(MAX_RECEIPT_BYTES + 1, "image/png")).toMatch(/photo is over 4 MB/);
  });
});
