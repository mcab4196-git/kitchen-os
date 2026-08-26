import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getReceiptWithItems, getReceiptImageUrl } from "@/server/services/receipt";
import { getFormReference } from "@/server/services/reference";
import { normalizeUnit } from "@/lib/units";
import { ReviewForm, type ReviewRow } from "./review-form";
import { Button } from "@/components/ui/button";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dup?: string }>;
}) {
  const { id } = await params;
  const { dup } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [receipt, ref] = await Promise.all([getReceiptWithItems(user!.id, id), getFormReference()]);
  if (!receipt) notFound();
  const imageUrl = await getReceiptImageUrl(receipt.imagePath);
  const isPdf = receipt.imagePath?.toLowerCase().endsWith(".pdf");
  const committed = receipt.status === "COMMITTED";

  const meta = (
    <div className="mb-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
      {receipt.store ?? "Unknown store"}
      {receipt.purchaseDate ? ` · ${new Date(receipt.purchaseDate).toLocaleDateString()}` : ""}
      {receipt.total != null ? ` · ${receipt.total} ${receipt.currency ?? ""}` : ""}
      <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-ink">{receipt.status}</span>
    </div>
  );

  const imageBlock = imageUrl ? (
    isPdf ? (
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm text-brand"
      >
        📄 Open receipt PDF
      </a>
    ) : (
      <details className="mb-4 rounded-xl border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer text-sm text-muted">View receipt image</summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Receipt" className="mt-3 rounded-xl" />
      </details>
    )
  ) : null;

  if (receipt.status === "FAILED") {
    return (
      <main>
        <header className="mb-4 flex items-center gap-3">
          <Link href="/scan" className="text-sm text-muted hover:text-ink">
            ← Back
          </Link>
          <h1 className="font-display text-2xl text-ink">Couldn&apos;t read that receipt</h1>
        </header>
        {imageBlock}
        <div className="mt-2 rounded-2xl border border-dashed border-line bg-status-critical/5 p-6 text-center">
          <p className="font-display text-lg text-ink">Extraction failed</p>
          <p className="mt-1 text-sm text-muted">
            The AI couldn&apos;t read this one. Try a sharper, well-lit photo (or the original PDF),
            and make sure the whole receipt is in frame.
          </p>
          <Link href="/scan" className="mt-4 inline-block">
            <Button>Try again</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (committed) {
    return (
      <main>
        <header className="mb-4 flex items-center gap-3">
          <Link href="/receipts" className="text-sm text-muted hover:text-ink">
            ← Receipts
          </Link>
          <h1 className="font-display text-2xl text-ink">Receipt</h1>
        </header>
        {meta}
        {imageBlock}
        <ul className="flex flex-col gap-2">
          {receipt.items.map((it) => (
            <li key={it.id} className="rounded-xl border border-line bg-card p-3 text-sm">
              <span className="font-medium text-ink">{it.rawName}</span>
              <span className="text-muted">
                {" "}
                · {it.quantity ?? "?"} {it.unit ?? ""}
                {it.inventoryItemId ? " · added" : ""}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/inventory" className="mt-6 inline-block">
          <Button>Go to inventory</Button>
        </Link>
      </main>
    );
  }

  const rows: ReviewRow[] = receipt.items.map((it) => {
    const cat = it.categoryGuess
      ? ref.categories.find((c) => c.name.toLowerCase() === it.categoryGuess!.toLowerCase())
      : undefined;
    const matched = it.ingredientId ? ref.ingredients.find((g) => g.id === it.ingredientId) : undefined;
    return {
      receiptItemId: it.id,
      rawName: it.rawName,
      include: true,
      productName: it.rawName,
      ingredientName: matched?.canonicalName ?? "",
      categoryId: cat?.id ?? matched?.categoryId ?? "",
      quantity: it.quantity ?? null,
      unit: normalizeUnit(it.unit) ?? matched?.defaultUnit ?? "",
      storageLocation: "REFRIGERATOR",
      price: it.price ?? null,
      confidence: it.extractionConfidence ?? 1,
    };
  });

  return (
    <main>
      <header className="mb-4 flex items-center gap-3">
        <Link href="/scan" className="text-sm text-muted hover:text-ink">
          ← Scan another
        </Link>
        <h1 className="font-display text-2xl text-ink">Review your groceries</h1>
      </header>

      {dup && (
        <div className="mb-4 rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
          You&apos;ve scanned this receipt before — showing the existing extraction.
        </div>
      )}
      {meta}
      {imageBlock}

      <p className="mb-3 text-sm text-muted">
        Check each line, fix anything the AI got wrong, then add them to your inventory.
        Add an ingredient to a line so we can estimate its expiry.
      </p>

      <ReviewForm
        receiptId={receipt.id}
        initialRows={rows}
        categories={ref.categories.map((c) => ({ id: c.id, name: c.name }))}
        ingredients={ref.ingredients.map((g) => ({
          id: g.id,
          name: g.canonicalName,
          categoryId: g.categoryId,
          defaultUnit: g.defaultUnit,
        }))}
      />
    </main>
  );
}
