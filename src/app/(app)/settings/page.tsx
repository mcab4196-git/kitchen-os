import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/login/actions";
import { recalculateExpiry } from "./actions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="animate-fade-in">
      <PageHeader title="Settings" subtitle={user?.email ? `Signed in as ${user.email}` : undefined} />

      <div className="flex flex-col gap-3">
        <Link
          href="/settings/preferences"
          className="group flex items-center gap-3 rounded-card border border-line bg-card p-4 shadow-card transition duration-fast ease-out hover:border-line-strong hover:shadow-pop active:translate-y-px"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <Icon name="settings" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">Preferences</p>
            <p className="mt-0.5 text-[13px] text-muted">Household, diet, allergies, cuisines, units.</p>
          </div>
          <Icon
            name="chevron-right"
            size={18}
            className="shrink-0 text-faint transition-transform duration-fast group-hover:translate-x-0.5"
          />
        </Link>

        <section className="rounded-card border border-line bg-card p-4 shadow-card">
          <p className="text-[15px] font-semibold text-ink">Expiry estimates</p>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Re-estimate expiry for all items using the latest shelf-life data. Dates you set yourself are left
            untouched.
          </p>
          <form action={recalculateExpiry} className="mt-3">
            <SubmitButton variant="secondary" size="sm" pendingText="Recalculating…">
              Recalculate estimates
            </SubmitButton>
          </form>
        </section>
      </div>

      <form action={signOut} className="mt-8">
        <Button type="submit" variant="ghost" className="text-status-critical-fg hover:bg-status-critical-bg">
          <Icon name="arrow-left" size={16} />
          Sign out
        </Button>
      </form>
    </main>
  );
}
