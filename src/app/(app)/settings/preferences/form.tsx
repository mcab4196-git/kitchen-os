"use client";

import { useActionState } from "react";
import { savePreferences, type PrefsState } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError } from "@/components/ui/feedback";
import { CorePreferenceFields } from "@/components/preferences/core-fields";
import type { PreferencesInput } from "@/lib/preferences-form";

export function PreferencesForm({ initial }: { initial: PreferencesInput }) {
  const [state, action, pending] = useActionState<PrefsState, FormData>(savePreferences, {});

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Preferences"
        subtitle="These shape the recipes and plans we suggest. Allergies and disliked foods are hard filters — never suggested."
        back="/settings"
        size="md"
      />

      <form action={action} className="flex flex-col gap-4">
        <CorePreferenceFields initial={initial} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Units" htmlFor="pref-unitSystem">
            <Select id="pref-unitSystem" name="unitSystem" defaultValue={initial.unitSystem}>
              <option value="metric">Metric (g, ml)</option>
              <option value="imperial">Imperial (oz, cups)</option>
            </Select>
          </Field>
          <Field label="Currency" htmlFor="pref-currency" hint="Three letters, e.g. PHP.">
            <Input id="pref-currency" name="currency" maxLength={3} defaultValue={initial.currency} />
          </Field>
        </div>

        <Field label="Warn me this many days before expiry" htmlFor="pref-expiringDays">
          <Input
            id="pref-expiringDays"
            name="expiringDays"
            type="number"
            min="1"
            max="14"
            inputMode="numeric"
            defaultValue={initial.expiringDays}
          />
        </Field>

        {state.saved && (
          <p
            role="status"
            className="rounded-control border border-status-fresh-border bg-status-fresh-bg px-3 py-2 text-small text-status-fresh-fg"
          >
            Preferences saved.
          </p>
        )}
        {state.error && <FormError>{state.error}</FormError>}

        <Button type="submit" loading={pending} size="lg" className="mt-1">
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </main>
  );
}
