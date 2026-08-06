import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { useFinanceData } from "@/crm/lib/useFinanceData";
import FinanceOverview from "@/crm/finance/FinanceOverview";
import Invoices from "@/crm/finance/Invoices";
import Expenses from "@/crm/finance/Expenses";
import LedgerTab from "@/crm/finance/LedgerTab";
import Accounts from "@/crm/finance/Accounts";
import ReportsTab from "@/crm/finance/ReportsTab";
import MarginsTab from "@/crm/finance/MarginsTab";

const TABS = ["Overview", "Invoices", "Expenses", "Ledger", "Accounts", "Margins", "Reports"] as const;
type Tab = (typeof TABS)[number];

export default function Finance() {
  const { level, loading } = useSavvyIdentity();
  const [tab, setTab] = useState<Tab>("Overview");
  const data = useFinanceData();

  if (loading) return <EmptyState>Loading…</EmptyState>;
  if (level !== "owner" && level !== "office_manager") {
    return <EmptyState>Finance is limited to the owner and assigned office managers.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Savvy Ledger"
        sub="Your own books — invoicing, expenses, accounts and reports in one place."
        right={
          <button className="ss-btn ss-btn-ghost" onClick={() => data.reload()} disabled={data.loading}>
            <RefreshCw size={13} className={data.loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} className={`ss-btn ${tab === t ? "" : "ss-btn-ghost"}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {data.loading && !data.accounts.length ? (
        <EmptyState>Loading your books…</EmptyState>
      ) : (
        <>
          {tab === "Overview" && <FinanceOverview data={data} />}
          {tab === "Invoices" && <Invoices data={data} />}
          {tab === "Expenses" && <Expenses data={data} />}
          {tab === "Ledger" && <LedgerTab data={data} />}
          {tab === "Accounts" && <Accounts data={data} />}
          {tab === "Reports" && <ReportsTab data={data} />}
        </>
      )}
    </div>
  );
}
