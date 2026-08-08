import { useState } from "react";
import { CreditCard, Landmark, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendPortalReceipt } from "@/lib/portal-receipt.functions";


export type PayableInvoice = {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string | null;
  stripe_payment_url: string | null;
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

const METHODS = [
  { key: "card", label: "Card", icon: CreditCard, hint: "Visa, Mastercard, Amex, Discover" },
  { key: "ach", label: "Bank transfer", icon: Landmark, hint: "ACH from your checking account" },
  { key: "phone", label: "Pay by phone", icon: Phone, hint: "We call you back to take payment" },
] as const;

type MethodKey = (typeof METHODS)[number]["key"];

export default function PortalPayDialog({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: PayableInvoice;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState<MethodKey>("card");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const sendReceipt = useServerFn(sendPortalReceipt);


  async function submit() {
    setBusy(true);
    const { error } = await supabase.rpc("ss_portal_pay_invoice", {
      p_invoice_id: invoice.id,
      p_method: method,
      ...(reference ? { p_reference: reference } : {}),
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    let receiptNote = "receipt on the way";
    try {
      const res = await sendReceipt({
        data: { invoiceId: invoice.id, method, ...(reference ? { reference } : {}) },
      });
      if (res.channels.length) {
        receiptNote = `receipt sent by ${res.channels.join(" + ")}`;
      }
    } catch {
      /* payment recorded; receipt delivery is best-effort */
    }

    setBusy(false);
    toast.success(`Payment recorded for ${invoice.invoice_number} — ${receiptNote}.`);
    onPaid();
    onClose();

  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Pay invoice ${invoice.invoice_number}`}
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md border border-hairline bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">
          Invoice {invoice.invoice_number}
</p>
        <h2 className="mt-1 font-display text-3xl uppercase leading-none">{money(invoice.amount)}</h2>
        <p className="mt-2 font-tech text-xs text-primary/60">
          {invoice.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : "Due on receipt"}
        </p>

        <div className="mt-5 grid gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const on = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                aria-pressed={on}
                className={`flex items-start gap-3 border p-3 text-left transition-colors ${
                  on ? "border-accent bg-accent/5" : "border-hairline hover:border-primary/40"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>
                  <span className="block font-tech text-xs font-semibold uppercase tracking-wide">{m.label}</span>
                  <span className="block font-tech text-[11px] text-primary/60">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {invoice.stripe_payment_url && method === "card" && (
          <a
            href={invoice.stripe_payment_url}
            className="mt-4 block border border-primary/25 px-4 py-2 text-center font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
          >
            Open secure card checkout
          </a>
        )}

        <label className="mt-4 block font-tech text-[10px] uppercase tracking-widest text-primary/50">
          Reference or note (optional)
          <input
            value={reference}
            maxLength={120}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Check #1042, split payment, etc."
            className="mt-1.5 w-full border border-hairline bg-background px-3 py-2 font-tech text-sm normal-case tracking-normal text-primary"
          />
        </label>

        <p className="mt-4 flex items-start gap-2 font-tech text-[11px] text-primary/60">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          Your invoice moves to <span className="text-accent">processing</span> right away and the office confirms
          the funds — you&rsquo;ll get an emailed receipt the moment it clears.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="btn-quote flex-1 rounded-md px-4 py-3 text-[11px] font-bold uppercase tracking-wide disabled:opacity-60"
          >
            {busy ? "Processing…" : `Pay ${money(invoice.amount)}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="border border-primary/25 px-4 py-3 font-tech text-[11px] uppercase tracking-wide text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
