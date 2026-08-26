"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { uploadReceipt, type ScanState } from "./actions";
import { Button } from "@/components/ui/button";

export default function ScanPage() {
  const [state, action, pending] = useActionState<ScanState, FormData>(uploadReceipt, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setHasFile(Boolean(f));
    setFileName(f?.name ?? null);
    const pdf = f?.type === "application/pdf";
    setIsPdf(pdf);
    setPreview(f && !pdf ? URL.createObjectURL(f) : null);
  }

  return (
    <main>
      <header className="mb-5 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          ← Back
        </Link>
        <h1 className="font-display text-2xl text-ink">Scan receipt</h1>
        <Link href="/receipts" className="ml-auto text-sm text-brand">
          History
        </Link>
      </header>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card p-6 text-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Receipt preview" className="max-h-72 rounded-xl object-contain" />
          ) : isPdf ? (
            <>
              <span className="text-3xl" aria-hidden>
                📄
              </span>
              <span className="font-medium text-ink">{fileName}</span>
              <span className="text-sm text-muted">PDF ready to extract</span>
            </>
          ) : (
            <>
              <span className="text-3xl" aria-hidden>
                🧾
              </span>
              <span className="font-medium text-ink">Take a photo or upload</span>
              <span className="text-sm text-muted">JPEG, PNG, WebP or PDF · up to 10 MB</span>
            </>
          )}
          <input
            ref={inputRef}
            name="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onPick}
            className="hidden"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-status-critical">
            {state.error}
          </p>
        )}

        <p className="text-xs text-muted">
          We send the image to the AI only to read the items. The photo is stored privately in your
          account and you can delete it any time.
        </p>

        <Button type="submit" disabled={!hasFile || pending} className="h-12">
          {pending ? "Reading receipt…" : "Extract items"}
        </Button>
      </form>
    </main>
  );
}
