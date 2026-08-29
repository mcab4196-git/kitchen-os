"use client";

import { useActionState } from "react";
import { savePreferences, type PrefsState } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input, Select } from "@/components/ui/field";

export interface PrefsInitial {
  householdSize: number;
  diet: string;
  allergies: string;
  dislikes: string;
  cuisines: string;
  skill: string;
  maxCookMinutes: number;
  unitSystem: string;
  currency: string;
  expiringDays: number;
}

export function PreferencesForm({ initial }: { initial: PrefsInitial }) {
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="People to cook for">
            <Input name="householdSize" type="number" min="1" inputMode="numeric" defaultValue={initial.householdSize} />
          </Field>
          <Field label="Diet">
            <Select name="diet" defaultValue={initial.diet}>
              <option value="">No preference</option>
              <option value="omnivore">Omnivore</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="pescatarian">Pescatarian</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
            </Select>
          </Field>
        </div>

        <Field label="Allergies" hint="Comma-separated, e.g. peanuts, shellfish. Never suggested.">
          <Input name="allergies" defaultValue={initial.allergies} placeholder="peanuts, shellfish" />
        </Field>

        <Field label="Disliked foods" hint="Comma-separated. Avoided in suggestions.">
          <Input name="dislikes" defaultValue={initial.dislikes} placeholder="olives, cilantro" />
        </Field>

        <Field label="Favourite cuisines" hint="Comma-separated. Nudges suggestions.">
          <Input name="cuisines" defaultValue={initial.cuisines} placeholder="italian, thai, filipino" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cooking skill">
            <Select name="skill" defaultValue={initial.skill}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
          <Field label="Max cook time (min)">
            <Input name="maxCookMinutes" type="number" min="10" step="5" inputMode="numeric" defaultValue={initial.maxCookMinutes} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Units">
            <Select name="unitSystem" defaultValue={initial.unitSystem}>
              <option value="metric">Metric (g, ml)</option>
              <option value="imperial">Imperial (oz, cups)</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Input name="currency" defaultValue={initial.currency} />
          </Field>
        </div>

        <Field label="Warn me this many days before expiry">
          <Input name="expiringDays" type="number" min="1" max="14" inputMode="numeric" defaultValue={initial.expiringDays} />
        </Field>

        {state.saved && (
          <p
            role="status"
            className="rounded-control border border-status-fresh-border bg-status-fresh-bg px-3 py-2 text-[13px] text-status-fresh-fg"
          >
            Preferences saved.
          </p>
        )}
        {state.error && (
          <p
            role="alert"
            className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
          >
            {state.error}
          </p>
        )}

        <Button type="submit" loading={pending} size="lg" className="mt-1">
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </main>
  );
}
