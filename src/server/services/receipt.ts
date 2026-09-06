import crypto from "node:crypto";
import { prisma } from "@/server/db";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/server/ai/provider";
import { validateAndClean, simplifyProductName, type ReviewedItem } from "@/server/ai/schemas";
import { resolveIngredientByText } from "./reference";
import { createInventoryItem } from "./inventory";

const BUCKET = process.env.RECEIPTS_BUCKET ?? "receipts";

export type ParseOutcome =
  | { ok: true; receiptId: string }
  | { ok: false; error: string; duplicateOf?: string };

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Upload a receipt image, detect duplicates by content hash, run AI extraction,
 * validate + clean it, and store the receipt with its parsed items (status
 * PARSED, awaiting user review). Nothing here writes to inventory — that only
 * happens after the user reviews and commits (Step 2).
 */
export async function createAndParseReceipt(userId: string, file: File): Promise<ParseOutcome> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) return { ok: false, error: "The image was empty." };
  if (buffer.length > 10 * 1024 * 1024) return { ok: false, error: "Image is larger than 10 MB." };

  const mediaType = file.type || "image/jpeg";
  const hash = sha256(buffer);

  // Duplicate detection: block only on a prior *successful* scan of this image.
  // A previous FAILED or stuck PENDING attempt should be retryable, not a wall.
  const existing = await prisma.receipt.findFirst({ where: { userId, imageHash: hash } });
  if (existing) {
    if (existing.status === "COMMITTED" || existing.status === "PARSED") {
      return { ok: false, error: "You've already scanned this receipt.", duplicateOf: existing.id };
    }
    // Clear the stale attempt (cascades to its items) and re-parse cleanly.
    await prisma.receipt.delete({ where: { id: existing.id } });
  }

  // Upload to Storage under the user's folder (hash-named, so idempotent).
  const ext = (mediaType.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const path = `${userId}/${hash}.${ext}`;
  const supabase = await createClient();
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mediaType, upsert: true });
  if (upErr) return { ok: false, error: `Couldn't store the image: ${upErr.message}` };

  const receipt = await prisma.receipt.create({
    data: { userId, imagePath: path, imageHash: hash, status: "PENDING" },
  });

  try {
    const provider = await getAIProvider();
    const raw = await provider.parseReceipt({ base64: buffer.toString("base64"), mediaType });

    const cleaned = validateAndClean(raw);
    if (!cleaned.ok) {
      await prisma.receipt.update({ where: { id: receipt.id }, data: { status: "FAILED" } });
      return { ok: false, error: cleaned.error };
    }
    const data = cleaned.data;

    // Lightweight normalization: try to map each line to a canonical ingredient.
    const itemsWithIngredient = await Promise.all(
      data.items.map(async (it) => {
        const ing = await resolveIngredientByText(simplifyProductName(it.rawName));
        return { ...it, ingredientId: ing?.id ?? null };
      })
    );

    await prisma.$transaction([
      prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          store: data.store,
          purchaseDate: data.purchaseDate,
          currency: data.currency,
          total: data.total,
          status: "PARSED",
        },
      }),
      prisma.receiptItem.createMany({
        data: itemsWithIngredient.map((it) => ({
          receiptId: receipt.id,
          rawName: it.rawName,
          quantity: it.quantity,
          unit: it.unit,
          price: it.price,
          categoryGuess: it.category,
          ingredientId: it.ingredientId,
          extractionConfidence: it.confidence,
        })),
      }),
    ]);

    return { ok: true, receiptId: receipt.id };
  } catch (e) {
    await prisma.receipt.update({ where: { id: receipt.id }, data: { status: "FAILED" } });
    const msg = e instanceof Error ? e.message : "AI extraction failed.";
    return { ok: false, error: msg };
  }
}

export async function getReceiptWithItems(userId: string, receiptId: string) {
  return prisma.receipt.findFirst({
    where: { id: receiptId, userId },
    include: { items: { orderBy: { rawName: "asc" } } },
  });
}

/** All of a user's receipts, newest first, with a line-item count. */
export async function listReceipts(userId: string) {
  return prisma.receipt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
}

/**
 * Commit the user's reviewed items into inventory. For each included item we
 * create an inventory record (expiry estimated by the engine), link the receipt
 * line to it, and — when the user confirmed an ingredient — learn an alias from
 * the raw receipt text so future receipts auto-match (§4 normalization-over-time).
 */
export async function commitReceipt(
  userId: string,
  receiptId: string,
  items: ReviewedItem[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const receipt = await prisma.receipt.findFirst({ where: { id: receiptId, userId } });
  if (!receipt) return { ok: false, error: "Receipt not found." };
  if (receipt.status === "COMMITTED") return { ok: false, error: "This receipt was already added." };

  const included = items.filter((i) => i.include);
  if (included.length === 0) return { ok: false, error: "No items selected to add." };

  // The receiptItemId values come from the client payload — never trust them.
  // Every reviewed line must belong to THIS receipt, or a caller could point the
  // update at another user's receipt_items row.
  const ownItemIds = new Set(
    (await prisma.receiptItem.findMany({ where: { receiptId: receipt.id }, select: { id: true } })).map((r) => r.id)
  );
  if (included.some((it) => !ownItemIds.has(it.receiptItemId))) {
    return { ok: false, error: "Those items don't belong to this receipt." };
  }

  // One transaction for the whole batch: a mid-loop failure (a DB blip, the
  // @unique inventoryItemId colliding, an alias race) must roll every item back,
  // not leave a half-commit that a retry then duplicates.
  const count = await prisma.$transaction(
    async (tx) => {
      let n = 0;
      for (const it of included) {
        const invItem = await createInventoryItem(
          userId,
          {
            productName: it.productName,
            ingredientName: it.ingredientName,
            categoryId: it.categoryId,
            quantity: it.quantity ?? 1,
            unit: it.unit ?? "pcs",
            storageLocation: it.storageLocation,
            purchaseDate: receipt.purchaseDate ?? new Date(),
            opened: false,
            exactExpiryDate: null, // let the expiry engine estimate
            price: it.price,
            currency: receipt.currency,
            store: receipt.store,
            source: "RECEIPT",
            receiptId: receipt.id,
          },
          tx
        );

        await tx.receiptItem.update({
          where: { id: it.receiptItemId },
          data: { inventoryItemId: invItem.id },
        });

        // Alias learning: if this line resolved to a canonical ingredient, remember
        // the raw receipt phrasing so the next receipt matches without asking.
        if (invItem.ingredientId) {
          const key = simplifyProductName(it.rawName);
          if (key.length > 2) {
            await tx.ingredientAlias.upsert({
              where: { aliasText: key },
              update: {},
              create: { ingredientId: invItem.ingredientId, aliasText: key, source: "USER", confidence: 0.9 },
            });
          }
        }
        n++;
      }

      await tx.receipt.update({ where: { id: receipt.id }, data: { status: "COMMITTED" } });
      return n;
    },
    { timeout: 20_000 }
  );

  return { ok: true, count };
}

/** A short-lived signed URL to display a stored receipt image. */
export async function getReceiptImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(imagePath, 60 * 10);
  return data?.signedUrl ?? null;
}
