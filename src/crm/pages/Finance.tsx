import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";

type Invoice = { id: string; invoice_number: string; amount: number; kind: string; status: string; issued_on: string; customer_id: string };
type Payment = { id: string; amount: number; kind: string; method: string | null; created_at: string };
type Expense = { id: string; category: string; vendor: string | null; description: string | null; amount: number; spent_on: string };

const monthOf = (d: string) => d.slice(0, 7);

export default function Finance() {
  const { level, loading } = useSavvyIdentity();

  const { rows: invoices } = useTable<Invoice>("fin-invoices", async () => {
    const { data } = await supabase.from("ss_invoices").select("id,invoice_number,amount,kind,status,issued_on,customer_id").order("issued_on", { ascending: false });
    return (data ?? []) as Invoice[];
  });
  const { rows: payments } = useTable<Payment>("fin-payments", async () => {
    const { data } = await supabase.from("ss_payments").select("id,amount,kind,method,created_at").order("created_at", { ascending: false });
    return (data ?? []) as Payment[];
  });
  const { rows: expenses } = useTable<Expense>("fin-expenses", async () => {
    const { data } = await supabase.from("ss_expenses").select("id,category,vendor,description,amount,spent_on").order("spent_on", { ascending: false });
    return (data ?? []) as Expense[];
  });

  const thisMonth = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const collected = payments.filter((p) => monthOf(p.created_at) === thisMonth).reduce((s, p) => s + Number(p.amount), 0);
    const recurring = payments.filter((p) => monthOf(p.created_at) === thisMonth && p.kind === "recurring").reduce((s, p) => s + Number(p.amount), 0);
    const spent = expenses.filter((e) => monthOf(e.spent_on) === thisMonth).reduce((s, e) => s + Number(e.amount), 0);
    const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
    return { collected, recurring, jobRevenue: collected - recurring, spent, outstanding, net: collected - spent };
  }, [payments, expenses, invoices, thisMonth]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of expenses.filter((x) => monthOf(x.spent_on) === thisMonth)) m[e.category] = (m[e.category] ?? 0) + Number(e.amount);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [expenses, thisMonth]);

  if (loading) return <EmptyState>Loading…</EmptyState>;
  if (level !== "owner") return <EmptyState>Finance is restricted to the owner account.</EmptyState>;

  return (
    <div className="space-y-4">
      <SectionTitle title="Finance" sub="Owner only · current month" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Collected" value={money(stats.collected)} />
        <StatTile label="Recurring" value={money(stats.recurring)} />
        <StatTile label="Jobs & repairs" value={money(stats.jobRevenue)} />
        <StatTile label="Net" value={money(stats.net)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="ss-card p-4">
          <div className="ss-label mb-2">Expenses by category</div>
          {!byCategory.length && <EmptyState>No expenses this month.</EmptyState>}
          <div className="space-y-2">
            {byCategory.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-[0.8rem]">
                  <span>{cat}</span>
                  <span className="ss-num font-semibold">{money(amt)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full" style={{ background: "hsl(var(--ss-sand))" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((amt / (byCategory[0][1] || 1)) * 100)}%`, background: "hsl(var(--ss-burgundy))" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Outstanding invoices · {money(stats.outstanding)}</div>
          <div className="space-y-1.5">
            {invoices.filter((i) => i.status !== "paid").slice(0, 12).map((i) => (
              <div key={i.id} className="flex items-center justify-between text-[0.8rem]">
                <span className="ss-num">{i.invoice_number}</span>
                <span className="flex items-center gap-2">
                  <Chip tone={i.status === "overdue" ? "burgundy" : "gold"}>{i.status}</Chip>
                  <span className="ss-num font-semibold">{money(i.amount)}</span>
                </span>
              </div>
            ))}
            {!invoices.filter((i) => i.status !== "paid").length && <EmptyState>Everything is paid.</EmptyState>}
          </div>
        </div>
      </div>

      <div className="ss-card p-4">
        <div className="ss-label mb-2">Recent expenses</div>
        <div className="space-y-1.5">
          {expenses.slice(0, 15).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-[0.8rem]">
              <span>
                <strong>{e.vendor ?? e.category}</strong>
                <span className="opacity-60"> · {e.description ?? e.category} · {new Date(e.spent_on).toLocaleDateString()}</span>
              </span>
              <span className="ss-num font-semibold">{money(e.amount)}</span>
            </div>
          ))}
          {!expenses.length && <EmptyState>No expenses recorded.</EmptyState>}
        </div>
      </div>
    </div>
  );
}
