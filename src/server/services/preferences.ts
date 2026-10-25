import { prisma } from "@/server/db";
import type { PreferencesInput } from "@/lib/preferences-form";

export type { PreferencesInput };

/**
 * Accessibility toggles. Stored alongside `expiringDays` in the
 * `notificationThresholds` JSON so no migration is needed; all default `false`,
 * which is exactly current behaviour.
 */
export interface AccessibilityPrefs {
  /** Follow the OS text size (bumps the app's root scale). */
  largerText: boolean;
  /** Force-reduce motion regardless of the OS `prefers-reduced-motion`. */
  reduceMotion: boolean;
  /** Show expiry as an absolute date ("7 Sep") instead of "in 2 days". */
  absoluteDates: boolean;
}

type ThresholdBlob = { expiringDays?: number } & Partial<AccessibilityPrefs>;

/** Read the accessibility toggles off a preferences row. */
export function accessibilityPrefs(row: { notificationThresholds: unknown } | null): AccessibilityPrefs {
  const t = (row?.notificationThresholds ?? {}) as ThresholdBlob;
  return {
    largerText: t.largerText === true,
    reduceMotion: t.reduceMotion === true,
    absoluteDates: t.absoluteDates === true,
  };
}

/** Load a user's preferences, creating a default row if missing. */
export async function getPreferences(userId: string) {
  return prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function updatePreferences(userId: string, input: PreferencesInput) {
  // Preserve any accessibility keys already in the JSON blob — saving the main
  // preferences form must not wipe them.
  const existing = await prisma.userPreference.findUnique({ where: { userId } });
  const prev = (existing?.notificationThresholds ?? {}) as ThresholdBlob;
  const notificationThresholds = { ...prev, expiringDays: input.expiringDays };

  const fields = {
    householdSize: input.householdSize,
    diet: input.diet,
    allergies: input.allergies,
    dislikes: input.dislikes,
    cuisines: input.cuisines,
    skill: input.skill,
    maxCookMinutes: input.maxCookMinutes,
    unitSystem: input.unitSystem,
    currency: input.currency,
    notificationThresholds,
  };

  return prisma.userPreference.upsert({
    where: { userId },
    update: fields,
    create: { userId, ...fields },
  });
}

/** Persist just the accessibility toggles, merging into the JSON blob. */
export async function updateAccessibilityPrefs(userId: string, prefs: AccessibilityPrefs) {
  const existing = await prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  const prev = (existing.notificationThresholds ?? {}) as ThresholdBlob;
  return prisma.userPreference.update({
    where: { userId },
    data: {
      notificationThresholds: {
        ...prev,
        largerText: prefs.largerText,
        reduceMotion: prefs.reduceMotion,
        absoluteDates: prefs.absoluteDates,
      },
    },
  });
}
