"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const initial: AuthState = {};

export default function LoginPage() {
  const [signInState, signInAction, signInPending] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);

  const error = signInState.error ?? signUpState.error;

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
      <header className="mb-8">
        <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-contrast">
          <Icon name="leaf" size={20} />
        </span>
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-brand">Kitchen OS</p>
        <h1 className="mt-2 font-display text-title-lg leading-tight text-ink text-balance">
          Know what you have. Cook before it expires.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Sign in to track your inventory, expiry dates, and meals.
        </p>
      </header>

      <form className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </Field>

        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
          >
            {error}
          </p>
        )}
        {signUpState.message && (
          <p
            role="status"
            className="rounded-control border border-status-fresh-border bg-status-fresh-bg px-3 py-2 text-[13px] text-status-fresh-fg"
          >
            {signUpState.message}
          </p>
        )}

        <Button type="submit" formAction={signInAction} loading={signInPending} size="lg" className="mt-1">
          {signInPending ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          type="submit"
          variant="secondary"
          formAction={signUpAction}
          loading={signUpPending}
          size="lg"
        >
          {signUpPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </main>
  );
}
