import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/crm/lib/pricing";
import JobTimer from "@/crm/components/JobTimer";

type TimeEntry = {
  id: string; worked_on: string; minutes: number; hourly_rate: number; note: string | null;
  staff_id: string | null;
};
type Expense = {
  id: string; label: string; category: string; amount: number; spent_on: string;
};

const CATEGORIES = ["material", "chemical", "part", "subcontractor", "other"];

/** Job-level profitability: revenue vs labor + expenses. */
export default function JobProfit({ jobId, price }: { jobId: string; price: number }) {
  const [time, setTime] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [tMinutes, setTMinutes] = useState("60");
  const [tRate, setTRate] = useState("35");
  const [tNote, setTNote] = useState("");
  const [eLabel, setELabel] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eCategory, setECategory] = useState(CATEGORIES[0]!);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, e] = await Promise.all([
      supabase.from("ss_job_time_entries").select("id,worked_on,minutes,hourly_rate,note,staff_id")
        .eq("job_id", jobId).order("worked_on"),
      supabase.from("ss_job_expenses").select("id,label,category,amount,spent_on")
        .eq("job_id", jobId).order("spent_on"),
    ]);
    setTime((t.data ?? []) as TimeEntry[]);
    setExpenses((e.data ?? []) as Expense[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  const laborCost = useMemo(
    () => time.reduce((s, t) => s + (Number(t.minutes) / 60) * Number(t.hourly_rate), 0),
    [time],
  );
  const expenseCost = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );
  const cost = laborCost + expenseCost;
  const revenue = Number(price ?? 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const barMax = Math.max(revenue, cost, 1);

  const addTime = async () => {
    const minutes = Math.max(1, Number(tMinutes) || 0);
    const { error } = await supabase.from("ss_job_time_entries").insert({
      job_id: jobId, minutes, hourly_rate: Number(tRate) || 0, note: tNote.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    setTNote("");
    void load();
  };

  const addExpense = async () => {
    if (!eLabel.trim()) { toast.error("Name the expense"); return; }
    const { error } = await supabase.from("ss_job_expenses").insert({
      job_id: jobId, label: eLabel.trim(), category: eCategory, amount: Number(eAmount) || 0,
    });
    if (error) { toast.error(error.message); return; }
    setELabel(""); setEAmount("");
    void load();
  };

  const removeTime = async (id: string) => {
    await supabase.from("ss_job_time_entries").delete().eq("id", id);
    void load();
  };
  const removeExpense = async (id: string) => {
    await supabase.from("ss_job_expenses").delete().eq("id", id);
    void load();
  };

  return (
    <div className="mt-3 space-y-4 border-t pt-3" style={{ borderColor: "hsl(var(--ss-burgundy) / .15)" }}>
      <JobTimer jobId={jobId} onChange={() => void load()} />
      <div className="ss-card p-3">

        <div className="ss-label">Total cost to date</div>
        <div className="ss-num text-[1.6rem] font-bold" style={{ color: "hsl(var(--ss-burgundy))" }}>
          {money(cost)}
        </div>
        <div className="mt-2 space-y-1.5 text-[0.78rem]">
          {([["Revenue", revenue, "hsl(var(--ss-aqua))"], ["Cost", cost, "hsl(var(--ss-burgundy))"]] as const).map(
            ([label, value, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-16 opacity-70">{label}</span>
                <span className="h-2.5 flex-1" style={{ background: "hsl(var(--ss-burgundy) / .08)" }}>
                  <span className="block h-2.5" style={{ width: `${(value / barMax) * 100}%`, background: color }} />
                </span>
                <span className="ss-num w-20 text-right font-semibold">{money(value)}</span>
              </div>
            ),
          )}
          <div className="flex items-center justify-between border-t pt-1.5"
            style={{ borderColor: "hsl(var(--ss-burgundy) / .15)" }}>
            <span className="opacity-70">Profit</span>
            <span className="ss-num font-bold" style={{ color: profit >= 0 ? "hsl(var(--ss-green))" : "hsl(var(--ss-burgundy))" }}>
              {margin.toFixed(2)}% · {money(profit)}
            </span>
          </div>
        </div>
      </div>

      <div className="ss-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Clock size={14} /> <span className="ss-label">Labor</span>
        </div>
        {loading ? (
          <div className="text-[0.78rem] opacity-60">Loading…</div>
        ) : !time.length ? (
          <div className="text-[0.78rem] opacity-60">Time tracked to this job will show here</div>
        ) : (
          <div className="space-y-1">
            {time.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-[0.78rem]">
                <span className="ss-num opacity-70">{new Date(`${t.worked_on}T12:00:00`).toLocaleDateString()}</span>
                <span className="font-semibold">{(t.minutes / 60).toFixed(2)} hr</span>
                <span className="opacity-70">@ {money(t.hourly_rate)}/hr</span>
                <span className="flex-1 truncate opacity-70">{t.note ?? ""}</span>
                <span className="ss-num font-semibold">{money((t.minutes / 60) * t.hourly_rate)}</span>
                <button className="ss-btn ss-btn-ghost" onClick={() => removeTime(t.id)} aria-label="Remove time entry">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 grid gap-2 sm:grid-cols-[90px_90px_1fr_auto]">
          <input className="ss-input" type="number" min={1} value={tMinutes} onChange={(e) => setTMinutes(e.target.value)} aria-label="Minutes" />
          <input className="ss-input" type="number" min={0} step="0.5" value={tRate} onChange={(e) => setTRate(e.target.value)} aria-label="Hourly rate" />
          <input className="ss-input" value={tNote} onChange={(e) => setTNote(e.target.value)} placeholder="What was done" aria-label="Note" />
          <button className="ss-btn" onClick={addTime}><Plus size={12} /> Add time</button>
        </div>
      </div>

      <div className="ss-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Receipt size={14} /> <span className="ss-label">Expenses</span>
        </div>
        {!expenses.length ? (
          <div className="text-[0.78rem] opacity-60">Track all expenses for this job in one place</div>
        ) : (
          <div className="space-y-1">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-[0.78rem]">
                <span className="ss-num opacity-70">{new Date(`${e.spent_on}T12:00:00`).toLocaleDateString()}</span>
                <span className="font-semibold">{e.label}</span>
                <span className="opacity-60">{e.category}</span>
                <span className="flex-1" />
                <span className="ss-num font-semibold">{money(e.amount)}</span>
                <button className="ss-btn ss-btn-ghost" onClick={() => removeExpense(e.id)} aria-label="Remove expense">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px_110px_auto]">
          <input className="ss-input" value={eLabel} onChange={(e) => setELabel(e.target.value)} placeholder="Pump seal kit" aria-label="Expense" />
          <select className="ss-input" value={eCategory} onChange={(e) => setECategory(e.target.value)} aria-label="Category">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="ss-input" type="number" min={0} step="0.01" value={eAmount} onChange={(e) => setEAmount(e.target.value)} placeholder="0.00" aria-label="Amount" />
          <button className="ss-btn" onClick={addExpense}><Plus size={12} /> Add expense</button>
        </div>
      </div>
    </div>
  );
}
