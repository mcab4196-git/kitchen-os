import { createClient } from "@/lib/supabase/server";
import { getPreferences } from "@/server/services/preferences";
import { PreferencesForm } from "./form";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const p = await getPreferences(user!.id);

  const thresholds = (p.notificationThresholds ?? {}) as { expiringDays?: number };

  return (
    <PreferencesForm
      initial={{
        householdSize: p.householdSize,
        diet: p.diet ?? "",
        allergies: p.allergies.join(", "),
        dislikes: p.dislikes.join(", "),
        cuisines: p.cuisines.join(", "),
        skill: p.skill,
        maxCookMinutes: p.maxCookMinutes,
        unitSystem: p.unitSystem,
        currency: p.currency,
        expiringDays: thresholds.expiringDays ?? 2,
      }}
    />
  );
}
