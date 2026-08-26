"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";

const initial: AuthState = {};

export default function LoginPage() {
  const [signInState, signInAction, signInPending] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">Kitchen OS</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          Know what you have.
          <br />
          Cook before it expires.
        </h1>
        <p className="mt-3 text-sm text-muted">
          Sign in to track your inventory, expiry dates, and meals.
        </p>
      </header>

      <form className="flex flex-col gap-3">
        <label className="text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          placeholder="you@example.com"
        />

        <label className="mt-2 text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="h-11 rounded-xl border border-line bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
          placeholder="At least 8 characters"
        />

        {(signInState.error || signUpState.error) && (
          <p role="alert" className="text-sm text-status-critical">
            {signInState.error ?? signUpState.error}
          </p>
        )}
        {signUpState.message && (
          <p role="status" className="text-sm text-brand">
            {signUpState.message}
          </p>
        )}

        <div className="mt-3 flex gap-3">
          <Button type="submit" formAction={signInAction} disabled={signInPending} className="flex-1">
            {signInPending ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            type="submit"
            variant="ghost"
            formAction={signUpAction}
            disabled={signUpPending}
            className="flex-1 border border-line"
          >
            {signUpPending ? "Creating…" : "Create account"}
          </Button>
        </div>
      </form>
    </main>
  );
}
