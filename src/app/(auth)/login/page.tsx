"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "./actions";
import { AuthHeader } from "../auth-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/feedback";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
      <AuthHeader
        title="Know what you have. Cook before it expires."
        subtitle="Sign in to track your inventory, expiry dates, and meals."
      />

      <form action={action} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </Field>

        {state.error && <FormError>{state.error}</FormError>}

        <Button type="submit" loading={pending} size="lg" className="mt-1">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        {/* PLAN 6.2: a new account gets its own two-step form, with the kitchen setup. */}
        <Button asChild variant="secondary" size="lg">
          <Link href="/signup">Create account</Link>
        </Button>
      </form>
    </main>
  );
}
