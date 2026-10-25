import { createClient } from "@/lib/supabase/server";
import { getPreferences, accessibilityPrefs } from "@/server/services/preferences";
import { signOut } from "@/app/(auth)/login/actions";
import { recalculateExpiry } from "./actions";
import { AccessibilitySettings } from "./accessibility-settings";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { SectionLabel } from "@/components/ui/section-label";
import { LinkRow } from "@/components/ui/card";

function NavRow({
  href,
  icon,
  tint,
  title,
  subtitle,
}: {
  href: string;
  icon: IconName;
  tint: string;
  title: string;
  subtitle: string;
}) {
  // The shared link row (PLAN 5.7): same padding, chevron and focus ring as every other.
  return (
    <LinkRow href={href} className="min-h-16">
      <span className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-body font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-small text-muted">{subtitle}</span>
        </span>
      </span>
    </LinkRow>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefs = await getPreferences(user!.id);
  const a11y = accessibilityPrefs(prefs);
  const thresholds = (prefs.notificationThresholds ?? {}) as { expiringDays?: number };
  const warnDays = thresholds.expiringDays ?? 2;

  return (
    <main className="animate-fade-in">
      <PageHeader title="Settings" subtitle={user?.email ? `Signed in as ${user.email}` : undefined} />

      <div className="flex flex-col gap-3">
        <NavRow
          href="/settings/preferences"
          icon="settings"
          tint="bg-brand-soft text-brand-ink"
          title="Preferences"
          subtitle="Household, diet, allergies, cuisines, units."
        />
        <NavRow
          href="/settings/preferences"
          icon="alert"
          tint="bg-status-soon-bg text-status-soon-fg"
          title="Expiry reminders"
          subtitle={`Warn ${warnDays} day${warnDays === 1 ? "" : "s"} before an item expires.`}
        />
        <NavRow
          href="/receipts"
          icon="clock"
          tint="bg-surface-2 text-muted"
          title="Receipt history"
          subtitle="Photos from past scans — delete any of them."
        />
      </div>

      <SectionLabel className="mb-2 mt-8">
        Accessibility
      </SectionLabel>
      <AccessibilitySettings
        initial={{
          largerText: a11y.largerText,
          reduceMotion: a11y.reduceMotion,
          absoluteDates: a11y.absoluteDates,
        }}
      />

      <section className="mt-6 rounded-card border border-line bg-card p-4 shadow-card">
        <p className="text-body font-semibold text-ink">Expiry estimates</p>
        <p className="mt-1 text-small leading-5 text-muted">
          Re-estimate expiry for all items using the latest shelf-life data. Dates you set yourself
          are left untouched.
        </p>
        <form action={recalculateExpiry} className="mt-3">
          <SubmitButton variant="secondary" size="sm" pendingText="Recalculating…">
            Recalculate estimates
          </SubmitButton>
        </form>
      </section>

      <form action={signOut} className="mt-8">
        <Button type="submit" variant="ghost" className="text-status-critical-fg hover:bg-status-critical-bg">
          <Icon name="arrow-left" size={16} />
          Sign out
        </Button>
      </form>
    </main>
  );
}
