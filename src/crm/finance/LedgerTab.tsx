import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import { EmptyState, Chip } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";
import { downloadCsv, netOf, postLedger, todayIso, type FinanceSlice } from "@/crm/finance/shared";

export default function LedgerTab({ data }: { data: FinanceSlice }) {
  const { ledger, accounts, customers, reload } = data;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"all" | string>("all");

  const [entryDate, setEntryDate] = useState(todayIso());
  const [accountId, setAccountId] = useState("");
  const [memo, setMemo] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");

  const nameOfAccount = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "Unassigned";
  const nameOfCustomer = (id: string | null) => customers.find((c) => c.id === id)?.full_name ?? null;

  const visible = useMemo(
    () => (source === "all" ? ledger : ledger.filter((l) => l.source === source)),
    [ledger, source],
  );

  const runningNet = useMemo(() => visible.reduce((s, l) => s + netOf(l), 0), [visible]);

  const save = async () => {
    const value = Number(amount);
    if (!memo.trim()) return toast.error("Add a memo so you know what this was");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      await postLedger({
        entry_date: entryDate,
        account_id: accountId || null,
        memo: memo.trim(),
        debit: direction === "in" ? value : 0,
        credit: direction === "out" ? value : 0,
        source: "manual",
      });
      toast.success("Entry posted");
      setMemo("");
      setAmount("");
      setAdding(false);
      await reload();
      return undefined;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not post the entry");
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(`savvy-ledger-${todayIso()}.csv`, [
      ["Date", "Account", "Memo", "Customer", "Source", "Reference", "Money in", "Money out"],
      ...visible.map((l) => [
        l.entry_date,
        nameOfAccount(l.account_id),
        l.memo,
        nameOfCustomer(l.customer_id) ?? "",
        l.source,
        l.reference ?? "",
        Number(l.debit).toFixed(2),
        Number(l.credit).toFixed(2),
      ]),
    ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="ss-input" style={{ maxWidth: 190 }} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All activity</option>
          <option value="invoice">Invoices</option>
          <option value="payment">Payments</option>
          <option value="expense">Expenses</option>
          <option value="manual">Manual entries</option>
          <option value="payroll">Payroll</option>
          <option value="adjustment">Adjustments</option>
        </select>
        <span className="ss-label">Net <span className="ss-num text-[1rem]">{money2(runningNet)}</span></span>
        <span className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={exportCsv}><Download size={13} /> Export</button>
        <button className="ss-btn" onClick={() => setAdding((v) => !v)}><Plus size={13} /> Manual entry</button>
      </div>

      {adding && (
        <div className="ss-card p-4 space-y-3">
          <div className="ss-label">Post a manual entry</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <input className="ss-input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            <select className="ss-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Account…</option>
              {accounts.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
            <input className="ss-input" placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
            <select className="ss-input" value={direction} onChange={(e) => setDirection(e.target.value as "in" | "out")}>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
            <input className="ss-input ss-num" type="number" min={0} step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="ss-btn ss-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="ss-btn" disabled={busy} onClick={save}>{busy ? "Posting…" : "Post entry"}</button>
          </div>
        </div>
      )}

      <div className="ss-card p-3">
        {!visible.length && <EmptyState>Nothing posted yet. Invoices, payments and expenses land here automatically.</EmptyState>}
        <div className="space-y-1.5">
          {visible.slice(0, 200).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-2 border-b pb-1.5 text-[0.8rem] last:border-0" style={{ borderColor: "hsl(var(--ss-sand))" }}>
              <span className="ss-num opacity-60">{new Date(l.entry_date).toLocaleDateString()}</span>
              <Chip tone={l.source === "expense" ? "burgundy" : l.source === "payment" ? "green" : "ink"}>{l.source}</Chip>
              <span>{l.memo}</span>
              <span className="opacity-50">{nameOfAccount(l.account_id)}</span>
              <span className="flex-1" />
              <span
                className="ss-num font-semibold"
                style={{ color: netOf(l) >= 0 ? "hsl(var(--ss-green))" : "hsl(var(--ss-burgundy))" }}
              >
                {netOf(l) >= 0 ? "+" : "−"}{money2(Math.abs(netOf(l)))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
