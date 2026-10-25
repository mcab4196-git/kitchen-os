"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailLinkOrigin } from "@/lib/redirect";
import { signUpErrorMessage } from "@/lib/auth-errors";
import { preferencesFromForm } from "@/lib/preferences-form";
import { updatePreferences } from "@/server/services/preferences";
import { betaSeatsLeft } from "@/server/services/beta";

export type SignUpState = { error?: string; step?: 1 | 2; done?: boolean; email?: string };

const BETA_FULL =
  "The Kitchen OS beta is full right now. Ask the person who shared the link with you to free up a spot.";

/**
 * Create the account and save the onboarding preferences in one go (PLAN 6.2).
 * "Skip for now" keeps the defaults. An error about the account itself sends the
 * form back to step 1, where the fix is.
 */
export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) {
    return { error: "Enter your email and a password of at least 8 characters.", step: 1 };
  }
  if ((await betaSeatsLeft()) <= 0) return { error: BETA_FULL, step: 1 };

  const supabase = await createClient();
  // The confirmation link comes back to the site the person signed up on, not localhost.
  const h = await headers();
  const origin = emailLinkOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto"),
  );
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    // The beta cap trigger (rls.sql) reaches us as Supabase Auth's generic database error.
    if (/database error/i.test(error.message)) return { error: BETA_FULL, step: 1 };
    return { error: signUpErrorMessage(error), step: 1 };
  }

  // Supabase answers an email that's already registered with a user that has no
  // identities (so sign-up can't be used to probe emails); nothing is saved for it.
  if (data.user && (data.user.identities?.length ?? 0) > 0) {
    const skipped = formData.get("skip") === "1";
    try {
      await updatePreferences(data.user.id, preferencesFromForm(skipped ? new FormData() : formData));
    } catch (e) {
      // The account exists either way; preferences can be set later in Settings.
      console.error("[signup] saving preferences failed", e);
    }
  }

  if (data.session) redirect("/dashboard"); // email confirmation turned off
  return { done: true, email };
}
