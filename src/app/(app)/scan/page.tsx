"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { uploadReceipt, type ScanState } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { IndeterminateBar, FormError } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { MAX_RECEIPT_BYTES } from "@/lib/receipt-file";
import { shrinkImage } from "./shrink-image";

export default function ScanPage() {
  const [state, action, pending] = useActionState<ScanState, FormData>(uploadReceipt, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // N1: photos are shrunk on the device before upload; this covers that short wait.
  const [preparing, setPreparing] = useState(false);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickId = useRef(0);

  async function accept(f: File | undefined) {
    const id = ++pickId.current;
    setHasFile(Boolean(f));
    setFileName(f?.name ?? null);
    const pdf = f?.type === "application/pdf";
    setIsPdf(pdf);
    setPreview(f && !pdf ? URL.createObjectURL(f) : null);
    setTooBig(null);
    if (!f) return;

    setPreparing(true);
    const upload = await shrinkImage(f);
    if (id !== pickId.current) return; // a newer pick replaced this one
    setPreparing(false);
    if (upload !== f) {
      try {
        const dt = new DataTransfer();
        dt.items.add(upload);
        if (inputRef.current) inputRef.current.files = dt.files;
      } catch {
        // No DataTransfer: the original goes up, and the server enforces the limit.
      }
    }
    if (upload.size > MAX_RECEIPT_BYTES) {
      setTooBig(
        pdf
          ? "That PDF is over 4 MB. Try a smaller export, or take a photo of the receipt instead."
          : "That image is over 4 MB and couldn't be shrunk here. Try taking the photo again.",
      );
    }
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
            className="inline-flex min-h-11 items-center gap-1 rounded-control border border-line bg-card px-3 text-small font-medium text-ink transition-colors duration-fast hover:bg-surface-2"
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
                <span className="text-small text-muted">PDF ready to extract</span>
              </>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon name="camera" size={20} />
                </span>
                <span className="font-medium text-ink">Photograph the whole receipt, flat and lit</span>
                <span className="text-small text-muted">Photos are resized for upload · PDFs up to 4&nbsp;MB</span>
              </>
            )}
          </div>

          {pending && (
            <div className="absolute inset-0 flex animate-fade-in flex-col items-center justify-center gap-3 bg-card/85 px-8 backdrop-blur-sm">
              <IndeterminateBar className="max-w-[12rem]" />
              <p role="status" aria-live="polite" className="text-small font-medium text-ink">
                Reading your receipt…
              </p>
              {/* PLAN 5.6: an honest expectation for the wait. */}
              <p className="text-center text-2xs leading-4 text-muted">
                This usually takes under 30 seconds. Keep this page open.
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

        {(tooBig ?? state.error) && (
          <FormError>{tooBig ?? state.error}</FormError>
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
            className="flex min-h-11 flex-col items-center gap-1.5 justify-self-start rounded-control px-2 py-1.5 text-small font-medium text-muted transition-colors duration-fast hover:text-ink disabled:opacity-40"
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

        <Button type="submit" loading={pending} disabled={!hasFile || preparing || Boolean(tooBig)} size="lg">
          {pending ? "Reading receipt…" : preparing ? "Preparing photo…" : "Extract items"}
        </Button>
      </form>
    </main>
  );
}
