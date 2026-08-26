import { prisma } from "@/server/db";

export interface PreferencesInput {
  householdSize: number;
  diet: string | null;
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  skill: string;
  maxCookMinutes: number;
  unitSystem: string;
  currency: string;
  expiringDays: number;
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
  return prisma.userPreference.upsert({
    where: { userId },
    update: {
      householdSize: input.householdSize,
      diet: input.diet,
      allergies: input.allergies,
      dislikes: input.dislikes,
      cuisines: input.cuisines,
      skill: input.skill,
      maxCookMinutes: input.maxCookMinutes,
      unitSystem: input.unitSystem,
      currency: input.currency,
      notificationThresholds: { expiringDays: input.expiringDays },
    },
    create: {
      userId,
      householdSize: input.householdSize,
      diet: input.diet,
      allergies: input.allergies,
      dislikes: input.dislikes,
      cuisines: input.cuisines,
      skill: input.skill,
      maxCookMinutes: input.maxCookMinutes,
      unitSystem: input.unitSystem,
      currency: input.currency,
      notificationThresholds: { expiringDays: input.expiringDays },
    },
  });
}
