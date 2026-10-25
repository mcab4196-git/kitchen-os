"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInErrorMessage } from "@/lib/auth-errors";

export type AuthState = { error?: string };

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: signInErrorMessage(error) };
  redirect("/dashboard");
}

// Sign-up lives in ../signup/actions.ts, with the onboarding step (PLAN 6.2).

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
