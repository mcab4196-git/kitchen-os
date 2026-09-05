"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { uploadReceipt, type ScanState } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { IndeterminateBar } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export default function ScanPage() {
  const [state, action, pending] = useActionState<ScanState, FormData>(uploadReceipt, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(f: File | undefined) {
    setHasFile(Boolean(f));
    setFileName(f?.name ?? null);
    const pdf = f?.type === "application/pdf";
    setIsPdf(pdf);
    setPreview(f && !pdf ? URL.createObjectURL(f) : null);
  }

  // One hidden input feeds the form; the two buttons only differ by whether they
  // ask the OS for the camera. On desktop `capture` is ignored and both open the
  // file picker — drag-and-drop onto the preview area still works too.
  function pick(useCamera: boolean) {
    const el = inputRef.current;
    if (!el) return;
    if (useCamera) el.setAttribute("capture", "environment");
    else el.removeAttribute("capture");
    el.click();
  }

  return (
    <main className="animate-fade-in">
      <PageHeader
        title="Scan receipt"
        back="/dashboard"
        size="md"
        actions={
          <Link
            href="/receipts"
            className="inline-flex min-h-11 items-center gap-1 rounded-control border border-line bg-card px-3 text-[13px] font-medium text-ink transition-colors duration-fast hover:bg-surface-2"
          >
            <Icon name="clock" size={15} />
            History
          </Link>
        }
      />

      <form action={action} className="flex flex-col gap-4">
        <div
          onClick={() => !pending && pick(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && inputRef.current) {
              inputRef.current.files = e.dataTransfer.files;
              accept(f);
            }
          }}
          className={cn(
            "relative flex min-h-[13rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-2 border-dashed p-6 text-center transition duration-fast ease-out",
            pending && "pointer-events-none",
            dragOver ? "border-brand bg-brand-soft" : "border-line-strong bg-card hover:border-brand/50",
          )}
        >
          <div key={preview ?? fileName ?? "empty"} className="flex animate-fade-in flex-col items-center gap-2">
            {preview ? (
              <div className="flex max-h-56 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Receipt preview" className="max-h-56 rounded-control object-contain" />
              </div>
            ) : isPdf ? (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon name="external" size={20} />
                </span>
                <span className="font-medium text-ink">{fileName}</span>
                <span className="text-[13px] text-muted">PDF ready to extract</span>
              </>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon name="camera" size={20} />
                </span>
                <span className="font-medium text-ink">Photograph the whole receipt, flat and lit</span>
                <span className="text-[13px] text-muted">JPEG, PNG, WebP or PDF · up to 10&nbsp;MB</span>
              </>
            )}
          </div>

          {pending && (
            <div className="absolute inset-0 flex animate-fade-in flex-col items-center justify-center gap-3 bg-card/85 px-8 backdrop-blur-sm">
              <IndeterminateBar className="max-w-[12rem]" />
              <p role="status" aria-live="polite" className="text-[13px] font-medium text-ink">
                Reading your receipt…
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            name="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            onChange={(e) => accept(e.target.files?.[0])}
            className="hidden"
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-control border border-status-critical-border bg-status-critical-bg px-3 py-2 text-[13px] text-status-critical-fg"
          >
            {state.error}
          </p>
        )}

        <p className="text-2xs leading-4 text-muted">
          The photo goes to the AI only to read the line items. It is stored privately in your account
          and you can delete it from Receipt history at any time.
        </p>

        <div className="grid grid-cols-3 items-center">
          <button
            type="button"
            onClick={() => pick(false)}
            disabled={pending}
            className="flex min-h-11 flex-col items-center gap-1.5 justify-self-start rounded-control px-2 py-1.5 text-[12px] font-medium text-muted transition-colors duration-fast hover:text-ink disabled:opacity-40"
          >
            <Icon name="external" size={22} />
            Choose file
          </button>
          <button
            type="button"
            onClick={() => pick(true)}
            disabled={pending}
            aria-label="Take a photo"
            className="flex h-[76px] w-[76px] items-center justify-center justify-self-center rounded-full border-4 border-brand bg-brand text-brand-contrast shadow-pop transition duration-fast ease-out hover:bg-brand-ink active:scale-95 disabled:opacity-40"
          >
            <Icon name="camera" size={30} />
          </button>
          <span aria-hidden />
        </div>

        <Button type="submit" loading={pending} disabled={!hasFile} size="lg">
          {pending ? "Reading receipt…" : "Extract items"}
        </Button>
      </form>
    </main>
  );
}
