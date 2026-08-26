import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface text-center">
      <p className="font-display text-3xl text-ink">Not found</p>
      <p className="mt-2 text-sm text-muted">That page doesn&apos;t exist.</p>
      <Link href="/dashboard" className="mt-5 text-brand underline underline-offset-2">
        Back to your kitchen
      </Link>
    </main>
  );
}
