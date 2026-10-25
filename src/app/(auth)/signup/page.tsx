import Link from "next/link";
import { betaSeatsLeft } from "@/server/services/beta";
import { Button } from "@/components/ui/button";
import { AuthHeader } from "../auth-header";
import { SignupForm } from "./signup-form";

// Reads the seat count on every visit; never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  // PLAN 6.1: say the beta is full before anyone types, not after.
  if ((await betaSeatsLeft()) <= 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-6 py-10">
        <AuthHeader
          title="The beta is full"
          subtitle="Kitchen OS is open to a small group while we test it. Ask the person who shared the link with you to free up a spot."
        />
        <Button asChild variant="secondary" size="lg">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </main>
    );
  }
  return <SignupForm />;
}
