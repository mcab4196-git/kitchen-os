"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signUp, type SignUpState } from "./actions";
import { AuthHeader } from "../auth-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/feedback";
import { CorePreferenceFields } from "@/components/preferences/core-fields";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences-form";

/**
 * Sign-up in two steps (PLAN 6.2): the account, then the kitchen. One form, so the
 * preferences are saved with the account; step 2 can be skipped because the
 * defaults already work, and everything stays editable in Settings.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, {});
  const [step, setStep] = useState<1 | 2>(1);

  // A server error about the account (email taken, beta full) sends you back to step 1.
  useEffect(() => {
    if (state.step) setStep(state.step);
  }, [state]);

  if (state.done) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
        <AuthHeader
          title="Check your email"
          subtitle={
            <>
              We sent a confirmation link to <span className="font-medium text-ink">{state.email}</span>. Open it, then
              sign in. Your kitchen settings are saved.
            </>
          }
        />
        <Button asChild size="lg">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
      <AuthHeader
        step={{ current: step, total: 2 }}
        title={step === 1 ? "Create your account" : "Set up your kitchen"}
        subtitle={
          step === 1
            ? "Step 1 of 2. Kitchen OS is in a small closed beta."
            : "Step 2 of 2. So dinner ideas fit your household. You can change these any time in Settings."
        }
      />

      <form
        action={action}
        // Step 1's button only moves on: the browser has already checked the email and password.
        onSubmit={(e) => {
          if (step === 1) {
            e.preventDefault();
            setStep(2);
          }
        }}
        className="flex flex-col gap-4"
      >
        {/* A class, not the hidden attribute: Tailwind's flex would override [hidden]. */}
        <fieldset className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
          <legend className="sr-only">Your account</legend>
          <Field label="Email" htmlFor="signup-email">
            <Input id="signup-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Password" htmlFor="signup-password" hint="At least 8 characters.">
            <Input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
        </fieldset>

        <fieldset className={step === 2 ? "flex flex-col gap-4" : "hidden"}>
          <legend className="sr-only">Your kitchen</legend>
          <CorePreferenceFields initial={PREFERENCE_DEFAULTS} idPrefix="signup" />
        </fieldset>

        {state.error && <FormError>{state.error}</FormError>}

        {step === 1 ? (
          <>
            <Button type="submit" size="lg" className="mt-1">
              Continue
            </Button>
            <p className="text-center text-small text-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand hover:text-brand-ink">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <Button type="submit" size="lg" loading={pending} className="mt-1">
              {pending ? "Creating account…" : "Create account"}
            </Button>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={pending}>
                Back
              </Button>
              <Button type="submit" name="skip" value="1" variant="ghost" formNoValidate disabled={pending}>
                Skip for now
              </Button>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
