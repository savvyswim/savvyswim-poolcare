import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Lock, Phone, Mail, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";

type Customer = {
  id: string; full_name: string; address: string | null; city: string | null;
  phone: string | null; email: string | null; status: string; gallons: number;
  gate_code: string | null; internal_notes: string | null; monthly_price: number;
  service_level: string; route_day: string | null; equipment: Record<string, string> | null;
  custom_fields: Record<string, boolean> | null;
};

type Visit = {
  id: string; scheduled_date: string; status: string; minutes_on_site: number | null;
  notes: string | null; readings: Record<string, number> | null; chem_cost: number | null;
};

const TABS = ["Overview", "Timeline", "Equipment", "Billing"] as const;

export default function CustomerDetail() {
  const { id = "" } = useParams();
  const { level } = useSavvyIdentity();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  const { rows: customers } = useTable<Customer>(`customer-${id}`, async () => {
    const { data } = await supabase.from("ss_customers").select("*").eq("id", id).limit(1);
    return (data ?? []) as Customer[];
  });
  const c = customers[0];

  const { rows: visits } = useTable<Visit>(`visits-${id}`, async () => {
    const { data } = await supabase
      .from("ss_visits")
      .select("id,scheduled_date,status,minutes_on_site,notes,readings,chem_cost")
      .eq("customer_id", id)
      .order("scheduled_date", { ascending: false })
      .limit(40);
    return (data ?? []) as unknown as Visit[];
  });

  const { rows: invoices } = useTable<{ id: string; invoice_number: string; amount: number; status: string; issued_on: string }>(
    `invoices-${id}`,
    async () => {
      const { data } = await supabase
        .from("ss_invoices")
        .select("id,invoice_number,amount,status,issued_on")
        .eq("customer_id", id)
        .order("issued_on", { ascending: false });
      return data ?? [];
    },
  );

  const lifetime = useMemo(() => invoices.reduce((s, i) => s + Number(i.amount), 0), [invoices]);

  if (!c) return <EmptyState>Loading customer…</EmptyState>;

  return (
    <div className="space-y-4">
      <Link to="/admin/crm/customers" className="inline-flex items-center gap-1.5 text-[0.78rem] !no-underline opacity-70">
        <ArrowLeft size={13} /> All customers
      </Link>

      <div className="ss-hero p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.35rem] leading-none">{c.full_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[0.78rem] opacity-85">
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.address}, {c.city}</span>
              {c.phone && <a className="inline-flex items-center gap-1 !text-inherit" href={`tel:${c.phone}`}><Phone size={12} /> {c.phone}</a>}
              {c.email && <a className="inline-flex items-center gap-1 !text-inherit" href={`mailto:${c.email}`}><Mail size={12} /> {c.email}</a>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone={c.status === "active" ? "green" : "orange"}>{c.status}</Chip>
              <Chip tone="aqua">{c.service_level}</Chip>
              {c.route_day && <Chip tone="aqua">{c.route_day}</Chip>}
              {c.gate_code && <Chip tone="gold"><Lock size={9} /> Gate {c.gate_code}</Chip>}
              {Object.entries(c.custom_fields ?? {}).filter(([, v]) => v).map(([k]) => <Chip key={k} tone="pink">{k}</Chip>)}
            </div>
          </div>
          <div className="text-right">
            <div className="ss-num text-[1.6rem] font-bold leading-none">{money(c.monthly_price)}</div>
            <div className="text-[0.66rem] opacity-70">per month</div>
          </div>
        </div>
      </div>

      {c.internal_notes && level !== "technician" && (
        <div className="ss-card p-3 text-[0.8rem]" style={{ background: "hsl(var(--ss-gold) / .18)" }}>
          <strong className="ss-tag">Internal note</strong>
          <div className="mt-1">{c.internal_notes}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {TABS.filter((t) => t !== "Billing" || level === "owner").map((t) => (
          <button key={t} className={`ss-btn ${tab === t ? "" : "ss-btn-ghost"}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Visits logged" value={String(visits.filter((v) => v.status === "completed").length)} />
          <Stat label="Pool volume" value={`${c.gallons.toLocaleString()} gal`} />
          {level === "owner" && <Stat label="Lifetime billed" value={money(lifetime)} />}
        </div>
      )}

      {tab === "Timeline" && (
        <div className="space-y-2">
          {!visits.length && <EmptyState>No visits yet.</EmptyState>}
          {visits.map((v) => (
            <div key={v.id} className="ss-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="ss-num text-[0.82rem] font-semibold">{new Date(v.scheduled_date).toLocaleDateString()}</span>
                <Chip tone={v.status === "completed" ? "green" : v.status === "skipped" ? "orange" : "aqua"}>{v.status}</Chip>
              </div>
              <div className="mt-1 text-[0.76rem] opacity-70">
                {v.readings?.fc != null && <>FC {v.readings.fc} ppm · </>}
                {v.readings?.ph != null && <>pH {v.readings.ph} · </>}
                {v.minutes_on_site ? `${v.minutes_on_site} min on site` : "—"}
              </div>
              {v.notes && <div className="mt-1 text-[0.8rem]">{v.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "Equipment" && (
        <div className="ss-card p-4">
          {Object.keys(c.equipment ?? {}).length === 0 ? (
            <EmptyState>No equipment recorded.</EmptyState>
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              {Object.entries(c.equipment ?? {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="ss-label">{k}</dt>
                  <dd className="text-[0.86rem]">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {tab === "Billing" && level === "owner" && (
        <div className="space-y-2">
          {!invoices.length && <EmptyState>No invoices.</EmptyState>}
          {invoices.map((i) => (
            <div key={i.id} className="ss-card flex items-center justify-between p-3">
              <div>
                <div className="ss-num text-[0.85rem] font-semibold">{i.invoice_number}</div>
                <div className="text-[0.72rem] opacity-60">{new Date(i.issued_on).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={i.status === "paid" ? "green" : i.status === "overdue" ? "burgundy" : "gold"}>{i.status}</Chip>
                <span className="ss-num font-bold">{money(i.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ss-card p-3.5">
      <div className="ss-label">{label}</div>
      <div className="ss-num mt-1 text-[1.4rem] font-bold leading-none" style={{ color: "hsl(var(--ss-burgundy))" }}>{value}</div>
    </div>
  );
}
