import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Expense, Invoice, LedgerEntry, Payment } from "@/crm/lib/ledger";

export type CustomerLite = { id: string; full_name: string };

export type FinanceData = {
  loading: boolean;
  accounts: Account[];
  ledger: LedgerEntry[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  customers: CustomerLite[];
  reload: () => Promise<void>;
};

/**
 * One fetch for the whole finance suite so every tab reads the same numbers.
 */
export function useFinanceData(): FinanceData {
  const [state, setState] = useState<Omit<FinanceData, "reload">>({
    loading: true,
    accounts: [],
    ledger: [],
    invoices: [],
    payments: [],
    expenses: [],
    customers: [],
  });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const [accounts, ledger, invoices, payments, expenses, customers] = await Promise.all([
      supabase.from("ss_accounts").select("*").order("sort_order"),
      supabase.from("ss_ledger").select("*").order("entry_date", { ascending: false }).limit(1000),
      supabase.from("ss_invoices").select("*").order("issued_on", { ascending: false }),
      supabase.from("ss_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("ss_expenses").select("*").order("spent_on", { ascending: false }),
      supabase.from("ss_customers").select("id, full_name").order("full_name"),
    ]);
    setState({
      loading: false,
      accounts: (accounts.data ?? []) as Account[],
      ledger: (ledger.data ?? []) as LedgerEntry[],
      invoices: (invoices.data ?? []) as Invoice[],
      payments: (payments.data ?? []) as Payment[],
      expenses: (expenses.data ?? []) as Expense[],
      customers: (customers.data ?? []) as CustomerLite[],
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
