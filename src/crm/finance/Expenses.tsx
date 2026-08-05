import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";
import { downloadCsv, monthKey, postLedger, thisMonthKey, todayIso, type FinanceSlice } from "@/crm/finance/shared";

export default function Expenses({ data }: { data: FinanceSlice }) {
  const { expenses, accounts, reload } = data;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(todayIso());

  const expenseAccounts = accounts.filter((a) => a.type === "expense" && a.is_active);
  const month = thisMonthKey();
  const monthTotal = useMemo(
    () => expenses.filter((e) => monthKey(e.spent_on) === month).reduce((s, e) => s + Number(e.amount), 0),
    [expenses, month],
  );

  const save = async () => {
    const acct = expenseAccounts.find((a) => a.id === accountId);
    const value = Number(amount);
    if (!acct) return toast.error("Pick an expense account");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      const { data: row, error } = await supabase
        .from("ss_expenses")
        .insert({
          category: acct.name,
          vendor: vendor.trim() || null,
          description: description.trim() || null,
          amount: value,
          spent_on: spentOn,
        })
        .select()
        .single();
      if (error) throw error;
      await postLedger({
        entry_date: spentOn,
        account_id: acct.id,
        memo: `${acct.name}${vendor ? ` — ${vendor}` : ""}${description ? `: ${description}` : ""}`,
        credit: value,
        source: "expense",
        ref_id: row.id,
        reference: vendor || null,
      });
      toast.success(`${money2(value)} recorded`);
      setVendor("");
      setDescription("");
      setAmount("");
      setAdding(false);
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save the expense");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(`savvy-expenses-${todayIso()}.csv`, [
      ["Date", "Account", "Vendor", "Description", "Amount"],
      ...expenses.map((e) => [e.spent_on, e.category, e.vendor ?? "", e.description ?? "", Number(e.amount).toFixed(2)]),
    ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ss-label">This month <span className="ss-num text-[1rem]">{money2(monthTotal)}</span></span>
        <span className="flex-1" />
        <button className="ss-btn ss-btn-ghost" onClick={exportCsv}><Download size={13} /> Export</button>
        <button className="ss-btn" onClick={() => setAdding((v) => !v)}><Plus size={13} /> Record expense</button>
      </div>

      {adding && (
        <div className="ss-card p-4 space-y-3">
          <div className="ss-label">New expense</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select className="ss-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Account…</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
            <input className="ss-input" placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            <input className="ss-input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="ss-input ss-num" type="number" min={0} step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="ss-input" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="ss-btn ss-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="ss-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save expense"}</button>
          </div>
        </div>
      )}

      <div className="ss-card p-3">
        {!expenses.length && <EmptyState>No expenses recorded yet.</EmptyState>}
        <div className="space-y-1.5">
          {expenses.slice(0, 100).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 border-b pb-1.5 text-[0.8rem] last:border-0" style={{ borderColor: "hsl(var(--ss-sand))" }}>
              <span className="ss-num opacity-60">{new Date(e.spent_on).toLocaleDateString()}</span>
              <strong>{e.vendor ?? e.category}</strong>
              <span className="opacity-60">{e.category}{e.description ? ` · ${e.description}` : ""}</span>
              <span className="flex-1" />
              <span className="ss-num font-semibold">{money2(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
