"use client";

import { PageHeader } from "@/components/ui/page-header";
import { ConsumeFields } from "./consume-fields";

export function ConsumeForm({
  id,
  productName,
  currentQuantity,
  unit,
}: {
  id: string;
  productName: string;
  currentQuantity: number;
  unit: string;
}) {
  return (
    <main className="animate-fade-in">
      <PageHeader title="Use item" back="/inventory" size="md" />

      <div className="mb-5 rounded-card border border-line bg-card p-4 shadow-card">
        <p className="text-[15px] font-semibold text-ink">{productName}</p>
        <p className="mt-0.5 text-[13px] text-muted tabular">
          In stock: {currentQuantity} {unit}
        </p>
      </div>

      <ConsumeFields id={id} currentQuantity={currentQuantity} unit={unit} />
    </main>
  );
}
