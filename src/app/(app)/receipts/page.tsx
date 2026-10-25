import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listReceipts } from "@/server/services/receipt";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, type Tone } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { DeleteReceipt } from "./delete-receipt";

const STATUS_TONE: Record<string, Tone> = {
  COMMITTED: "fresh",
  PARSED: "soon",
  PENDING: "unknown",
  FAILED: "critical",
};

const STATUS_LABEL: Record<string, string> = {
  COMMITTED: "Added",
  PARSED: "Needs review",
  PENDING: "Reading…",
  FAILED: "Failed",
};

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The layout redirects too, but it renders in parallel with this page.
  if (!user) redirect("/login");
  const receipts = await listReceipts(user.id);

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Receipts"
        back="/scan"
        size="md"
        actions={
          <Button asChild size="sm">
            <Link href="/scan">
              <Icon name="scan" size={16} />
              Scan
            </Link>
          </Button>
        }
      />

      {receipts.length === 0 ? (
        <EmptyState icon="scan" title="No receipts yet" description="Scan a grocery receipt to add several items at once." />
      ) : (
        <ul className="flex flex-col gap-2">
          {receipts.map((r) => {
            const date = new Date(r.purchaseDate ?? r.createdAt).toLocaleDateString();
            return (
              // The card holds the row link and, beside it, Delete (a button can't sit inside a link).
              <li
                key={r.id}
                className="flex items-center gap-1 rounded-card border border-line bg-card pr-1.5 shadow-card transition duration-fast ease-out hover:border-line-strong hover:shadow-pop"
              >
                <Link
                  href={`/scan/${r.id}/review`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-card p-3.5 active:translate-y-px"
                >
                  <div className="min-w-0">
                    <p className="truncate text-compact font-semibold text-ink">{r.store ?? "Unknown store"}</p>
                    <p className="mt-0.5 text-small text-muted tabular">
                      {date}
                      {` · ${r._count.items} item${r._count.items === 1 ? "" : "s"}`}
                      {r.total != null ? ` · ${r.total} ${r.currency ?? ""}` : ""}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status] ?? "neutral"} className="shrink-0">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </Link>
                <DeleteReceipt id={r.id} label={`${r.store ?? "Unknown store"}, ${date}`} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
