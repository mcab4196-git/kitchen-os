import { prisma } from "@/server/db";

/**
 * Seats left in the closed beta (PLAN 6.1). The number lives in one place: the
 * `beta_seats_left()` function in prisma/rls.sql, which a trigger on auth.users also
 * enforces. This only lets the sign-up page say so politely before anyone types.
 */
export async function betaSeatsLeft(): Promise<number> {
  try {
    const [row] = await prisma.$queryRaw<{ seats: number }[]>`select public.beta_seats_left() as seats`;
    return Number(row?.seats ?? 0);
  } catch (e) {
    // The function missing (rls.sql not run yet) mustn't block sign-up: the trigger is the guard.
    console.error("[beta] seat check failed", e);
    return 1;
  }
}
