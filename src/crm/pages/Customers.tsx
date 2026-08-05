import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { CITIES, money } from "@/crm/lib/pricing";

type Row = {
  id: string; full_name: string; address: string | null; city: string | null;
  phone: string | null; email: string | null; status: string; created_at: string;
  route_day: string | null; assigned_tech_id: string | null; gate_code: string | null;
  monthly_price: number; service_level: string;
};

type Segment = "routed" | "no_route" | "inactive" | "leads";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<Segment | null>(null);
  const [adding, setAdding] = useState(false);

  const { rows, refetch } = useTable<Row>("customers", async () => {
    const { data } = await supabase
      .from("ss_customers")
      .select("id,full_name,address,city,phone,email,status,created_at,route_day,assigned_tech_id,gate_code,monthly_price,service_level")
      .order("full_name");
    return (data ?? []) as Row[];
  });

  const { rows: leads, refetch: refetchLeads } = useTable<{
    id: string; full_name: string; city: string | null; phone: string | null;
    email: string | null; monthly_value: number; created_at: string; stage: string;
  }>("open-leads", async () => {
    const { data } = await supabase
      .from("ss_leads")
      .select("id,full_name,city,phone,email,monthly_value,created_at,stage")
      .not("stage", "in", "(won,lost)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

  const counts = useMemo(() => ({
    routed: rows.filter((r) => r.status === "active" && r.assigned_tech_id).length,
    no_route: rows.filter((r) => r.status === "active" && !r.assigned_tech_id).length,
    inactive: rows.filter((r) => r.status === "inactive").length,
    leads: leads.length,
  }), [rows, leads]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (seg === "routed" && !(r.status === "active" && r.assigned_tech_id)) return false;
      if (seg === "no_route" && !(r.status === "active" && !r.assigned_tech_id)) return false;
      if (seg === "inactive" && r.status !== "inactive") return false;
      if (!term) return true;
      return [r.full_name, r.address, r.city, r.email, r.phone]
        .some((v) => (v ?? "").toLowerCase().includes(term));
    });
  }, [rows, q, seg]);

  const importCsv = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/).slice(1);
    const payload = lines.map((line) => {
      const [full_name, address, city, phone, email] = line.split(",").map((s) => s?.trim());
      return { full_name, address, city, phone, email, status: "active" as const };
    }).filter((r) => r.full_name);
    if (!payload.length) return toast.error("No rows found");
    const { error } = await supabase.from("ss_customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${payload.length} customers`);
    void refetch();
  }, [refetch]);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Customers"
        sub={`${rows.length} records`}
        right={
          <div className="flex gap-2">
            <Link to="/admin/crm/pipeline" className="ss-btn ss-btn-ghost !no-underline">Pipeline →</Link>
            <button className="ss-btn" onClick={() => setAdding(true)}><Plus size={13} /> New</button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <SegChip label="Active (routed)" tone="green" count={counts.routed} active={seg === "routed"} onClick={() => setSeg(seg === "routed" ? null : "routed")} />
        <SegChip label="Active (no route)" tone="aqua" count={counts.no_route} active={seg === "no_route"} onClick={() => setSeg(seg === "no_route" ? null : "no_route")} />
        <SegChip label="Inactive" tone="orange" count={counts.inactive} active={seg === "inactive"} onClick={() => setSeg(seg === "inactive" ? null : "inactive")} />
        <SegChip label="Leads" tone="pink" count={counts.leads} active={seg === "leads"} onClick={() => setSeg(seg === "leads" ? null : "leads")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="ss-card flex flex-1 items-center gap-2 px-3">
          <Search size={14} className="opacity-50" />
          <input
            className="w-full bg-transparent py-2 text-[0.88rem] outline-none"
            placeholder="Search name, address, email, phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="ss-btn ss-btn-ghost cursor-pointer">
          <Upload size={13} /> CSV
          <input type="file" accept=".csv" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importCsv(f);
          }} />
        </label>
      </div>

      {seg === "leads" ? (
        <div className="space-y-2">
          {!leads.length && <EmptyState>No open leads.</EmptyState>}
          {leads.map((l) => (
            <div key={l.id} className="ss-card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-[0.9rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>{l.full_name}</div>
                <div className="text-[0.74rem] opacity-70">{l.city} · {l.phone} · {money(l.monthly_value)}/mo</div>
              </div>
              <button className="ss-btn" onClick={async () => {
                await supabase.from("ss_leads").update({ stage: "won" }).eq("id", l.id);
                toast.success("Converted — finish setup in the pipeline");
                void refetchLeads();
              }}>Convert</button>
              <button className="ss-btn ss-btn-ghost" onClick={async () => {
                await supabase.from("ss_leads").update({ stage: "lost" }).eq("id", l.id);
                void refetchLeads();
              }}>Deny</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {!filtered.length && <EmptyState>No customers match.</EmptyState>}
          {filtered.map((r) => (
            <Link key={r.id} to={`/crm/customers/${r.id}`} className="ss-card flex flex-wrap items-center gap-3 p-3 !no-underline !text-inherit">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.92rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>{r.full_name}</span>
                  {r.gate_code && <Chip tone="gold"><Lock size={9} /> Gate</Chip>}
                  <Chip tone={r.status === "inactive" ? "orange" : r.assigned_tech_id ? "green" : "aqua"}>
                    {r.status === "inactive" ? "Inactive" : r.assigned_tech_id ? `Routed · ${r.route_day ?? "—"}` : "No route"}
                  </Chip>
                </div>
                <div className="text-[0.75rem] opacity-70">{r.address}, {r.city}</div>
                <div className="text-[0.72rem] opacity-55">{r.phone} · {r.email}</div>
              </div>
              <div className="text-right">
                <div className="ss-num text-[0.95rem] font-bold">{money(r.monthly_price)}<span className="text-[0.66rem] opacity-60">/mo</span></div>
                <div className="text-[0.66rem] opacity-55">since {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {adding && <NewCustomer onDone={() => { setAdding(false); void refetch(); }} />}
    </div>
  );
}

function SegChip({ label, count, tone, active, onClick }: {
  label: string; count: number; tone: "green" | "aqua" | "orange" | "pink"; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{ opacity: active ? 1 : 0.75, outline: active ? "2px solid hsl(var(--ss-burgundy) / .35)" : "none", borderRadius: 999 }}>
      <Chip tone={tone}>{label} · {count}</Chip>
    </button>
  );
}

function NewCustomer({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ full_name: "", address: "", city: "Dallas", phone: "", email: "", monthly_price: 0 });
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onDone} />
      <div className="savvy-crm relative w-full max-w-md rounded-[16px] p-5" style={{ background: "hsl(var(--ss-cream))" }}>
        <h2 className="mb-3 text-[0.95rem]">New customer</h2>
        <div className="space-y-2.5">
          {(["full_name", "address", "phone", "email"] as const).map((k) => (
            <div key={k}>
              <label className="ss-label">{k.replace("_", " ")}</label>
              <input className="ss-input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="ss-label">City</label>
              <select className="ss-input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="ss-label">Monthly price</label>
              <input className="ss-input ss-num" type="number" value={f.monthly_price} onChange={(e) => setF({ ...f, monthly_price: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="ss-btn ss-btn-ghost flex-1" onClick={onDone}>Cancel</button>
          <button className="ss-btn flex-1" disabled={saving || !f.full_name} onClick={async () => {
            setSaving(true);
            const { error } = await supabase.from("ss_customers").insert(f);
            setSaving(false);
            if (error) return toast.error(error.message);
            toast.success("Customer created");
            onDone();
          }}>Create</button>
        </div>
      </div>
    </div>
  );
}
