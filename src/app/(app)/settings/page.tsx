import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/login/actions";
import { recalculateExpiry } from "./actions";
import { Button } from "@/components/ui/button";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ recalculated?: string }>;
}) {
  const { recalculated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <h1 className="font-display text-2xl text-ink">Settings</h1>
      <p className="mt-2 text-sm text-muted">Signed in as {user?.email}</p>

      {recalculated && (
        <div className="mt-4 rounded-xl border border-line bg-status-fresh/10 px-4 py-3 text-sm text-status-fresh">
          Recalculated expiry for {recalculated} item{recalculated === "1" ? "" : "s"}.
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-card">
        <p className="font-medium text-ink">Expiry estimates</p>
        <p className="mt-1 text-sm text-muted">
          Re-estimate expiry for all items using the latest shelf-life data. Items where you set an
          exact date yourself are left untouched.
        </p>
        <form action={recalculateExpiry} className="mt-3">
          <Button variant="ghost" className="border border-line">
            Recalculate expiry estimates
          </Button>
        </form>
      </section>

      <a
        href="/settings/preferences"
        className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-card p-4 shadow-card"
      >
        <div>
          <p className="font-medium text-ink">Preferences</p>
          <p className="mt-1 text-sm text-muted">Household, diet, allergies, cuisines, units.</p>
        </div>
        <span className="text-muted">›</span>
      </a>

      <form action={signOut} className="mt-6">
        <Button variant="ghost" className="border border-line">
          Sign out
        </Button>
      </form>
    </main>
  );
}
