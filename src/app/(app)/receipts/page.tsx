import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listReceipts } from "@/server/services/receipt";
import { Button } from "@/components/ui/button";

const STATUS_STYLE: Record<string, string> = {
  COMMITTED: "bg-status-fresh/10 text-status-fresh",
  PARSED: "bg-status-soon/10 text-status-soon",
  PENDING: "bg-status-unknown/10 text-status-unknown",
  FAILED: "bg-status-critical/10 text-status-critical",
};

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const receipts = await listReceipts(user!.id);

  return (
    <main>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Receipts</h1>
        <Link href="/scan">
          <Button className="h-10 px-3 text-sm">Scan</Button>
        </Link>
      </header>

      {receipts.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">No receipts yet. Scan one to get started.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {receipts.map((r) => (
            <li key={r.id}>
              <Link
                href={`/scan/${r.id}/review`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 shadow-card"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.store ?? "Unknown store"}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}
                    {` · ${r._count.items} item${r._count.items === 1 ? "" : "s"}`}
                    {r.total != null ? ` · ${r.total} ${r.currency ?? ""}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status] ?? ""}`}>
                  {r.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
