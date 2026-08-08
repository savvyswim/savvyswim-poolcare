import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, X } from "lucide-react";

export type LabelItem = {
  id: string;
  name: string;
  unit: string;
  sku: string | null;
  barcode: string | null;
};

export function codeFor(i: LabelItem) {
  return i.barcode?.trim() || i.sku?.trim() || `SS-${i.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Printable QR label sheet — one square code per product, sized for 2" stickers
 * on the truck bins. Scanning a label returns the item's barcode/SKU.
 */
export default function InventoryLabels({
  items,
  onClose,
}: {
  items: LabelItem[];
  onClose: () => void;
}) {
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const next: Record<string, string> = {};
      for (const i of items) {
        next[i.id] = await QRCode.toDataURL(codeFor(i), { margin: 1, width: 320 });
      }
      setCodes(next);
    })();
  }, [items]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-auto p-4">
      <div className="absolute inset-0 bg-black/60 print:hidden" onClick={onClose} />
      <div className="savvy-crm relative my-6 w-full max-w-3xl p-5" style={{ background: "hsl(var(--ss-cream))" }}>
        <div className="flex items-center justify-between print:hidden">
          <span className="ss-tag">Product labels · {items.length}</span>
          <div className="flex items-center gap-2">
            <button className="ss-btn flex items-center gap-1" onClick={() => window.print()}>
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} aria-label="Close labels"><X size={16} /></button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {items.map((i) => (
            <div key={i.id} className="border p-3 text-center" style={{ borderColor: "hsl(var(--ss-sand))", background: "#fff" }}>
              {codes[i.id] ? (
                <img src={codes[i.id]} alt={`QR code for ${i.name}`} className="mx-auto w-full max-w-[150px]" />
              ) : (
                <div className="mx-auto aspect-square w-full max-w-[150px] bg-black/5" />
              )}
              <div className="mt-2 text-[0.8rem] font-semibold leading-tight">{i.name}</div>
              <div className="ss-num text-[0.68rem] opacity-70">{codeFor(i)}</div>
              <div className="text-[0.65rem] opacity-55">per {i.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
