import { Field, Input, Select } from "@/components/ui/field";
import { DIET_OPTIONS, SKILL_OPTIONS, type PreferencesInput } from "@/lib/preferences-form";

/**
 * The preference fields that shape dinner ideas, shared by Settings and the sign-up
 * onboarding step so the two can't drift (PLAN 6.2). Each hint says why we ask.
 * `idPrefix` keeps the label-to-input ids unique when two forms could share a page.
 */
export function CorePreferenceFields({
  initial,
  idPrefix = "pref",
}: {
  initial: Pick<
    PreferencesInput,
    "householdSize" | "diet" | "allergies" | "dislikes" | "cuisines" | "skill" | "maxCookMinutes"
  >;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="People to cook for" htmlFor={id("householdSize")} hint="Sets the portions.">
          <Input
            id={id("householdSize")}
            name="householdSize"
            type="number"
            min="1"
            max="20"
            inputMode="numeric"
            defaultValue={initial.householdSize}
          />
        </Field>
        <Field label="Diet" htmlFor={id("diet")}>
          <Select id={id("diet")} name="diet" defaultValue={initial.diet ?? ""}>
            <option value="">No preference</option>
            {DIET_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Allergies"
        htmlFor={id("allergies")}
        hint="Comma-separated, e.g. peanuts, shellfish. Groups like dairy, gluten, eggs, shellfish or nuts block everything in them. Never suggested."
      >
        <Input id={id("allergies")} name="allergies" defaultValue={initial.allergies.join(", ")} placeholder="peanuts, shellfish" />
      </Field>

      <Field label="Disliked foods" htmlFor={id("dislikes")} hint="Comma-separated. Left out of suggestions.">
        <Input id={id("dislikes")} name="dislikes" defaultValue={initial.dislikes.join(", ")} placeholder="ampalaya, olives" />
      </Field>

      <Field label="Favourite cuisines" htmlFor={id("cuisines")} hint="Comma-separated. Nudges suggestions.">
        <Input id={id("cuisines")} name="cuisines" defaultValue={initial.cuisines.join(", ")} placeholder="filipino, italian, thai" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cooking skill" htmlFor={id("skill")}>
          <Select id={id("skill")} name="skill" defaultValue={initial.skill}>
            {SKILL_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Max cook time (min)" htmlFor={id("maxCookMinutes")}>
          <Input
            id={id("maxCookMinutes")}
            name="maxCookMinutes"
            type="number"
            min="10"
            max="240"
            step="5"
            inputMode="numeric"
            defaultValue={initial.maxCookMinutes}
          />
        </Field>
      </div>
    </>
  );
}
