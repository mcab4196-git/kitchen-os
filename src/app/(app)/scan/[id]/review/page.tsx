import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getReceiptWithItems, getReceiptImageUrl } from "@/server/services/receipt";
import { getFormReference, getShelfLifeRules } from "@/server/services/reference";
import { normalizeUnit } from "@/lib/units";
import { inferStorage, type ReviewRef } from "@/lib/review";
import type { ShelfLifeRuleish } from "@/lib/expiry";
import { ReviewForm, type ReviewRow } from "./review-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, type Tone } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

// Words, not the database enum; and no expiry colours, which only ever mean expiry.
const STATUS: Record<string, { tone: Tone; label: string }> = {
  COMMITTED: { tone: "brand", label: "Added" },
  PARSED: { tone: "neutral", label: "To review" },
  PENDING: { tone: "neutral", label: "Reading…" },
  FAILED: { tone: "critical", label: "Couldn't read" },
};

function money(total: number, currency: string | null): string {
  if (!currency) return String(total);
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(total);
  } catch {
    return `${total} ${currency}`; // not an ISO code the runtime knows
  }
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dup?: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [receipt, ref, rules] = await Promise.all([
    getReceiptWithItems(user!.id, id),
    getFormReference(),
    getShelfLifeRules(),
  ]);
  if (!receipt) notFound();
  const imageUrl = await getReceiptImageUrl(receipt.imagePath);
  const isPdf = receipt.imagePath?.toLowerCase().endsWith(".pdf");
  const committed = receipt.status === "COMMITTED";

  const meta = (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-line bg-card px-3.5 py-2.5 text-[13px] text-muted">
      <span className="font-medium text-ink">{receipt.store ?? "Unknown store"}</span>
      {receipt.purchaseDate && <span>· {new Date(receipt.purchaseDate).toLocaleDateString()}</span>}
      {receipt.total != null && <span className="tabular">· {money(receipt.total, receipt.currency)}</span>}
      <Badge tone={STATUS[receipt.status]?.tone ?? "neutral"} className="ml-auto">
        {STATUS[receipt.status]?.label ?? receipt.status}
      </Badge>
    </div>
  );

  const imageBlock = imageUrl ? (
    isPdf ? (
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-flex items-center gap-2 rounded-control border border-line bg-card px-3.5 py-2.5 text-[13px] font-medium text-brand transition-colors hover:bg-surface-2"
      >
        <Icon name="external" size={15} />
        Open receipt PDF
      </a>
    ) : (
      <details className="group mb-4 rounded-control border border-line bg-card px-3.5 py-2.5">
        <summary className="flex cursor-pointer items-center justify-between text-[13px] text-muted marker:content-['']">
          View receipt image
          <Icon name="chevron-right" size={15} className="transition-transform duration-fast group-open:rotate-90" />
        </summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Receipt" className="mt-3 rounded-control" />
      </details>
    )
  ) : null;

  if (receipt.status === "FAILED") {
    return (
      <main className="animate-fade-in">
        <PageHeader title="Couldn't read that receipt" back="/scan" size="md" />
        {imageBlock}
        <EmptyState
          icon="scan"
          title="Extraction failed"
          description="The AI couldn't read this one. Try a sharper, well-lit photo (or the original PDF) with the whole receipt in frame."
          action={
            <Button asChild>
              <Link href="/scan">Try again</Link>
            </Button>
          }
        />
      </main>
    );
  }

  if (committed) {
    return (
      <main className="animate-fade-in">
        <PageHeader title="Receipt" back="/receipts" size="md" />
        {meta}
        {imageBlock}
        <ul className="flex flex-col gap-2">
          {receipt.items.map((it) => (
            <li key={it.id} className="rounded-control border border-line bg-card p-3 text-[13px]">
              <span className="font-medium text-ink">{it.rawName}</span>
              <span className="text-muted tabular">
                {" "}
                · {it.quantity ?? "?"} {it.unit ?? ""}
                {it.inventoryItemId ? " · added" : ""}
              </span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-6">
          <Link href="/inventory">Go to inventory</Link>
        </Button>
      </main>
    );
  }

  const reviewRef: ReviewRef = {
    categories: ref.categories.map((c) => ({ id: c.id, name: c.name, defaultStorage: c.defaultStorageLocation })),
    ingredients: ref.ingredients.map((g) => ({ id: g.id, name: g.canonicalName, categoryId: g.categoryId })),
  };

  const rows: ReviewRow[] = receipt.items.map((it) => {
    const cat = it.categoryGuess
      ? ref.categories.find((c) => c.name.toLowerCase() === it.categoryGuess!.toLowerCase())
      : undefined;
    const matched = it.ingredientId ? ref.ingredients.find((g) => g.id === it.ingredientId) : undefined;
    const ingredientName = matched?.canonicalName ?? "";
    const categoryId = cat?.id ?? matched?.categoryId ?? "";
    return {
      receiptItemId: it.id,
      rawName: it.rawName,
      include: true,
      productName: it.rawName,
      ingredientName,
      categoryId,
      quantity: it.quantity ?? null,
      unit: normalizeUnit(it.unit) ?? matched?.defaultUnit ?? "",
      // PLAN 5.4: start where this food usually lives, not the fridge for everything.
      storageLocation: inferStorage({ ingredientName, categoryId }, reviewRef),
      price: it.price ?? null,
      confidence: it.extractionConfidence ?? 1,
    };
  });

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Review groceries"
        subtitle="Untick anything you don't want to keep track of, check the lines marked for a check, then add. Tap Edit to change a line."
        back="/scan"
        size="md"
      />
      {meta}
      {imageBlock}

      <ReviewForm
        receiptId={receipt.id}
        initialRows={rows}
        reference={reviewRef}
        rules={rules as ShelfLifeRuleish[]}
        purchaseDateISO={(receipt.purchaseDate ?? new Date()).toISOString()}
        ingredientUnits={Object.fromEntries(ref.ingredients.map((g) => [g.canonicalName, g.defaultUnit]))}
      />
    </main>
  );
}
