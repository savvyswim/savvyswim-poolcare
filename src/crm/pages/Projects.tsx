import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { FolderPlus, Hammer, Images, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { money } from "@/crm/lib/pricing";

export type ProjectKind = "construction" | "remodel";

export type Project = {
  id: string;
  customer_id: string | null;
  title: string;
  kind: string;
  status: string;
  address: string | null;
  city: string | null;
  budget_low: number | null;
  budget_high: number | null;
  start_date: string | null;
  target_date: string | null;
  notes: string | null;
  created_at: string;
};

export const PROJECT_STATUS: { key: string; label: string; tone: "ink" | "aqua" | "gold" | "green" }[] = [
  { key: "planning", label: "Planning", tone: "ink" },
  { key: "permitting", label: "Permitting", tone: "gold" },
  { key: "in_progress", label: "In progress", tone: "aqua" },
  { key: "punch_list", label: "Punch list", tone: "gold" },
  { key: "complete", label: "Complete", tone: "green" },
];

export function statusMeta(key: string) {
  return PROJECT_STATUS.find((s) => s.key === key) ?? PROJECT_STATUS[0];
}

type Counts = Record<string, { files: number; done: number; total: number }>;

export default function Projects() {
  const [rows, setRows] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [customers, setCustomers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: projects, error }, { data: custs }] = await Promise.all([
      supabase.from("ss_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("ss_customers").select("id, full_name").order("full_name"),
    ]);
    if (error) toast.error(error.message);
    const list = (projects ?? []) as Project[];
    setRows(list);
    setCustomers(custs ?? []);

    if (list.length) {
      const ids = list.map((p) => p.id);
      const [{ data: files }, { data: stages }] = await Promise.all([
        supabase.from("ss_project_files").select("project_id").in("project_id", ids),
        supabase.from("ss_project_stages").select("project_id,status").in("project_id", ids),
      ]);
      const map: Counts = {};
      for (const id of ids) map[id] = { files: 0, done: 0, total: 0 };
      (files ?? []).forEach((f) => { map[f.project_id].files += 1; });
      (stages ?? []).forEach((s) => {
        map[s.project_id].total += 1;
        if (s.status === "complete") map[s.project_id].done += 1;
      });
      setCounts(map);
    } else {
      setCounts({});
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.title, r.address, r.city, r.status].filter(Boolean).join(" ").toLowerCase().includes(t),
    );
  }, [rows, q]);

  const activeCount = rows.filter((r) => r.status !== "complete").length;
  const fileTotal = Object.values(counts).reduce((s, c) => s + c.files, 0);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Construction & Remodeling"
        sub="Every build gets a project file — stages, photos, plans and videos in one place."
        right={
          <button className="ss-btn" onClick={() => setOpen(true)}>
            <FolderPlus size={14} /> New project file
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Project files" value={String(rows.length)} tone="hero" />
        <StatTile label="Active builds" value={String(activeCount)} />
        <StatTile label="Media items" value={String(fileTotal)} />
      </div>

      <div className="ss-card flex items-center gap-2 p-2.5">
        <Search size={15} className="opacity-50" />
        <input
          className="ss-input flex-1 border-0 bg-transparent p-0"
          placeholder="Search projects, address or status"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Link to="/admin/designs" className="ss-btn ss-btn-ghost !no-underline">
          <Images size={14} /> Media library
        </Link>
      </div>

      {loading ? (
        <EmptyState>Loading project files…</EmptyState>
      ) : !filtered.length ? (
        <EmptyState>
          No project files yet. Create one for each pool build or remodel — every stage of the job
          lives inside it.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const c = counts[p.id] ?? { files: 0, done: 0, total: 0 };
            const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
            const st = statusMeta(p.status);
            return (
              <Link
                key={p.id}
                to={`/admin/crm/projects/${p.id}`}
                className="ss-card block p-4 !no-underline !text-inherit transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="ss-tag" style={{ fontSize: "0.5rem" }}>
                      {p.kind === "remodel" ? "Remodel" : "New build"}
                    </div>
                    <div className="text-[0.95rem] font-semibold leading-tight" style={{ color: "hsl(var(--ss-burgundy))" }}>
                      {p.title}
                    </div>
                  </div>
                  <Hammer size={16} className="opacity-40" />
                </div>
                <div className="mt-1 text-[0.74rem] opacity-65">
                  {[p.address, p.city].filter(Boolean).join(", ") || "No address on file"}
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "hsl(var(--ss-sand))" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "hsl(var(--ss-burgundy))" }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip tone={st.tone}>{st.label}</Chip>
                  <Chip tone="ink">{c.done}/{c.total} stages</Chip>
                  <Chip tone="aqua">{c.files} files</Chip>
                  {p.budget_low ? <Chip tone="gold">{money(p.budget_low)}+</Chip> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open && (
        <NewProjectDialog
          customers={customers}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); void load(); }}
        />
      )}
    </div>
  );
}

function NewProjectDialog({
  customers,
  onClose,
  onCreated,
}: {
  customers: { id: string; full_name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    kind: "construction" as ProjectKind,
    customer_id: "",
    address: "",
    city: "",
    budget_low: "",
    budget_high: "",
    start_date: "",
    target_date: "",
    notes: "",
  });

  async function save() {
    if (form.title.trim().length < 2) { toast.error("Give the project a name"); return; }
    setSaving(true);
    const { error } = await supabase.from("ss_projects").insert({
      title: form.title.trim(),
      kind: form.kind,
      customer_id: form.customer_id || null,
      address: form.address || null,
      city: form.city || null,
      budget_low: form.budget_low ? Number(form.budget_low) : null,
      budget_high: form.budget_high ? Number(form.budget_high) : null,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Project file created with its build stages");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45 animate-fade-in" onClick={onClose} />
      <div
        className="savvy-crm relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[18px] p-5 sm:rounded-[16px]"
        style={{ background: "hsl(var(--ss-cream))" }}
      >
        <h2 className="text-[1.05rem]">New project file</h2>
        <p className="mt-1 text-[0.78rem] opacity-65">
          Stages are created automatically — you can rename or add more inside the file.
        </p>

        <div className="mt-4 grid gap-3">
          <Row label="Project name">
            <input className="ss-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Hargrove residence — new build" />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Type">
              <select className="ss-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ProjectKind })}>
                <option value="construction">New pool build</option>
                <option value="remodel">Remodel</option>
              </select>
            </Row>
            <Row label="Customer">
              <select className="ss-input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">Not linked yet</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Address"><input className="ss-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Row>
            <Row label="City"><input className="ss-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Budget low"><input className="ss-input" inputMode="decimal" value={form.budget_low} onChange={(e) => setForm({ ...form, budget_low: e.target.value })} /></Row>
            <Row label="Budget high"><input className="ss-input" inputMode="decimal" value={form.budget_high} onChange={(e) => setForm({ ...form, budget_high: e.target.value })} /></Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Start"><input type="date" className="ss-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Row>
            <Row label="Target finish"><input type="date" className="ss-input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></Row>
          </div>
          <Row label="Notes">
            <textarea className="ss-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Row>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="ss-btn flex-1" disabled={saving} onClick={() => void save()}>
            {saving ? "Creating…" : "Create project file"}
          </button>
          <button className="ss-btn ss-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="ss-label mb-1 block">{label}</span>
      {children}
    </label>
  );
}
