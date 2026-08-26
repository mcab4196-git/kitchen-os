"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePreferences, type PrefsState } from "./actions";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand";

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
    <main>
      <header className="mb-5 flex items-center gap-3">
        <Link href="/settings" className="text-sm text-muted hover:text-ink">
          ← Settings
        </Link>
        <h1 className="font-display text-2xl text-ink">Preferences</h1>
      </header>

      <p className="mb-5 text-sm text-muted">
        These shape the recipes and meal plans we suggest. Allergies and disliked foods are used as
        hard filters — we&apos;ll never suggest a recipe that contains them.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="People to cook for">
            <input name="householdSize" type="number" min="1" defaultValue={initial.householdSize} className={field} />
          </Field>
          <Field label="Diet">
            <select name="diet" defaultValue={initial.diet} className={field}>
              <option value="">No preference</option>
              <option value="omnivore">Omnivore</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="pescatarian">Pescatarian</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
            </select>
          </Field>
        </div>

        <Field label="Allergies" hint="Comma-separated, e.g. peanuts, shellfish. Never suggested.">
          <input name="allergies" defaultValue={initial.allergies} className={field} placeholder="peanuts, shellfish" />
        </Field>

        <Field label="Disliked foods" hint="Comma-separated. Avoided in suggestions.">
          <input name="dislikes" defaultValue={initial.dislikes} className={field} placeholder="olives, cilantro" />
        </Field>

        <Field label="Favourite cuisines" hint="Comma-separated. Nudges suggestions.">
          <input name="cuisines" defaultValue={initial.cuisines} className={field} placeholder="italian, thai, filipino" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cooking skill">
            <select name="skill" defaultValue={initial.skill} className={field}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Max cook time (min)">
            <input name="maxCookMinutes" type="number" min="10" step="5" defaultValue={initial.maxCookMinutes} className={field} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Units">
            <select name="unitSystem" defaultValue={initial.unitSystem} className={field}>
              <option value="metric">Metric (g, ml)</option>
              <option value="imperial">Imperial (oz, cups)</option>
            </select>
          </Field>
          <Field label="Currency">
            <input name="currency" defaultValue={initial.currency} className={field} />
          </Field>
        </div>

        <Field label="Warn me this many days before expiry">
          <input name="expiringDays" type="number" min="1" max="14" defaultValue={initial.expiringDays} className={field} />
        </Field>

        {state.saved && (
          <p role="status" className="text-sm text-status-fresh">
            Preferences saved.
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-status-critical">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-2 h-12">
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
