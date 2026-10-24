import { RECEIPT_MAX_EDGE, fitWithin } from "@/lib/receipt-file";

/**
 * Shrink a receipt photo on the device before upload (N1). Phone photos are 2–6 MB,
 * but a receipt reads fine at 1600 px, so this re-encodes it as a JPEG of a few
 * hundred KB: under the upload limit and light on mobile data. Returns the original
 * for PDFs, for images the browser can't decode, or when re-encoding wouldn't help.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the camera's rotation, so the receipt isn't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, RECEIPT_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
