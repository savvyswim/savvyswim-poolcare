import { supabase } from "@/integrations/supabase/client";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export type LedgerEntry = {
  id: string;
  entry_date: string;
  account_id: string | null;
  customer_id: string | null;
  memo: string;
  debit: number;
  credit: number;
  source: "manual" | "invoice" | "payment" | "expense" | "payroll" | "adjustment";
  ref_id: string | null;
  reference: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  customer_id: string;
  invoice_number: string;
  amount: number;
  kind: string;
  status: string;
  issued_on: string;
  due_date: string | null;
  paid_at: string | null;
};

export type Payment = {
  id: string;
  invoice_id: string | null;
  customer_id: string | null;
  amount: number;
  kind: string;
  method: string | null;
  note: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  spent_on: string;
};

export const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

export const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

/** Money in minus money out for an entry, from the business's point of view. */
export const netOf = (e: { debit: number; credit: number }) => Number(e.debit) - Number(e.credit);

export const monthKey = (iso: string) => iso.slice(0, 7);

export const thisMonthKey = () => new Date().toISOString().slice(0, 7);

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Last `count` month keys, most recent first. */
export function recentMonths(count: number) {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

/** Days an invoice has been outstanding. */
export function ageDays(issuedOn: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(issuedOn).getTime()) / 86_400_000));
}

export const AGING_BUCKETS = ["Current", "1–30", "31–60", "61–90", "90+"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export function bucketFor(days: number): AgingBucket {
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "90+";
}

/**
 * Post a single line to the ledger. Everything financial in the company should
 * flow through here so the ledger stays the one source of truth.
 */
export async function postLedger(entry: {
  entry_date?: string;
  account_id?: string | null;
  customer_id?: string | null;
  memo: string;
  debit?: number;
  credit?: number;
  source?: LedgerEntry["source"];
  ref_id?: string | null;
  reference?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("ss_ledger").insert({
    entry_date: entry.entry_date ?? new Date().toISOString().slice(0, 10),
    account_id: entry.account_id ?? null,
    customer_id: entry.customer_id ?? null,
    memo: entry.memo,
    debit: entry.debit ?? 0,
    credit: entry.credit ?? 0,
    source: entry.source ?? "manual",
    ref_id: entry.ref_id ?? null,
    reference: entry.reference ?? null,
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

/** Find an account by its code (e.g. "4000"). */
export const accountByCode = (accounts: Account[], code: string) =>
  accounts.find((a) => a.code === code) ?? null;

/** Build and download a CSV file in the browser. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
