import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { money2 } from "@/crm/lib/pricing";
import { ACCOUNT_TYPES, TYPE_LABEL, netOf, type AccountType, type FinanceSlice } from "@/crm/finance/shared";

export default function Accounts({ data }: { data: FinanceSlice }) {
  const { accounts, ledger, reload } = data;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("expense");

  const balanceOf = (id: string) =>
    ledger.filter((l) => l.account_id === id).reduce((s, l) => s + netOf(l), 0);

  const save = async () => {
    if (!code.trim() || !name.trim()) return toast.error("Give the account a code and a name");
    setBusy(true);
    try {
      const { error } = await supabase.from("ss_accounts").insert({
        code: code.trim(),
        name: name.trim(),
        type,
        sort_order: (accounts.at(-1)?.sort_order ?? 0) + 10,
      });
      if (error) throw error;
      toast.success(`${name} added`);
      setCode("");
      setName("");
      setAdding(false);
      await reload();
      return undefined;
    } catch (err: any) {
      toast.error(err?.message ?? "Could not add the account");
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    await supabase.from("ss_accounts").update({ is_active: !isActive }).eq("id", id);
    await reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[0.78rem] opacity-70">
          Your own chart of accounts — the buckets every dollar gets filed into.
        </p>
        <span className="flex-1" />
        <button className="ss-btn" onClick={() => setAdding((v) => !v)}><Plus size={13} /> Add account</button>
      </div>

      {adding && (
        <div className="ss-card p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="ss-input ss-num" placeholder="Code (e.g. 5950)" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="ss-input" placeholder="Account name" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="ss-input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="ss-btn ss-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="ss-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Add account"}</button>
          </div>
        </div>
      )}

      {!accounts.length && <EmptyState>No accounts yet.</EmptyState>}

      <div className="grid gap-3 lg:grid-cols-2">
        {ACCOUNT_TYPES.filter((t) => accounts.some((a) => a.type === t)).map((t) => (
          <div key={t} className="ss-card p-4">
            <div className="ss-label mb-2">{TYPE_LABEL[t]}</div>
            <div className="space-y-1.5">
              {accounts
                .filter((a) => a.type === t)
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-[0.8rem]">
                    <span className="ss-num opacity-50" style={{ width: 42 }}>{a.code}</span>
                    <span className={a.is_active ? "" : "line-through opacity-40"}>{a.name}</span>
                    {!a.is_active && <Chip tone="ink">off</Chip>}
                    <span className="flex-1" />
                    <span className="ss-num font-semibold">{money2(Math.abs(balanceOf(a.id)))}</span>
                    <button className="ss-btn ss-btn-ghost px-2 py-0.5" onClick={() => toggle(a.id, a.is_active)}>
                      {a.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
