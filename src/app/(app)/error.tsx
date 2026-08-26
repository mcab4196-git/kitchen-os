"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-2xl text-ink">Something went wrong</p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        That page hit a snag. You can try again — your data is safe.
      </p>
      <Button onClick={reset} className="mt-5">
        Try again
      </Button>
    </main>
  );
}
