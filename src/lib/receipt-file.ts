// Receipt upload rules (N1 + S6) — pure, unit-tested.
//
// Phone photos are 2–6 MB, but Server Actions and Vercel cap a request body at
// a few MB, so photos are shrunk on the device before upload (see the scan page)
// and the server checks the real bytes before anything is stored.

/** Largest file the server accepts. Under the 4.5 MB Server Action / Vercel cap. */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

/** A receipt stays readable at this longest edge; anything bigger is wasted upload. */
export const RECEIPT_MAX_EDGE = 1600;

export type ReceiptMediaType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

/** Scale (width, height) down to fit `maxEdge` on the longest side, keeping the ratio. Never scales up. */
export function fitWithin(width: number, height: number, maxEdge: number = RECEIPT_MAX_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * The file's real type from its first bytes. The browser's label can be wrong or
 * spoofed, so the server stores and sends to the AI only what it recognises here.
 */
export function sniffReceiptType(bytes: Uint8Array): ReceiptMediaType | null {
  const at = (i: number) => bytes[i];
  const ascii = (from: number, text: string) =>
    bytes.length >= from + text.length && [...text].every((ch, i) => at(from + i) === ch.charCodeAt(0));

  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && at(0) === 0x89 && ascii(1, "PNG\r\n\x1a\n")) return "image/png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(0, "%PDF-")) return "application/pdf";
  return null;
}

/** A plain reason to reject the upload, or null when it's fine to store. */
export function receiptFileProblem(size: number, type: ReceiptMediaType | null): string | null {
  if (size === 0) return "The file was empty.";
  if (!type) return "That file isn't a photo or PDF we can read. Use a JPEG, PNG, WebP or PDF.";
  if (size > MAX_RECEIPT_BYTES) {
    return type === "application/pdf"
      ? "That PDF is over 4 MB. Try a smaller export, or take a photo of the receipt instead."
      : "That photo is over 4 MB. Try taking it again, or choose a smaller image.";
  }
  return null;
}
