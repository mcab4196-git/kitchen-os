import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
      <p className="font-display text-title-lg text-ink">Page not found</p>
      <p className="mt-2 text-sm text-muted">That page doesn&apos;t exist or has moved.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center rounded-control bg-brand px-5 text-sm font-medium text-brand-contrast transition-colors duration-fast hover:bg-brand-ink active:scale-[0.98]"
      >
        Back to your kitchen
      </Link>
    </main>
  );
}
