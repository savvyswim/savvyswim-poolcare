import { useCallback, useEffect, useState } from "react";
import { Play, Plus, Power, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import {
  ACTIONS, OPERATORS, TRIGGERS, type Action, type Automation, type Condition,
} from "@/crm/lib/automations";

type Run = {
  id: string;
  automation_id: string;
  trigger_event: string;
  subject_label: string | null;
  status: string;
  detail: string | null;
  created_at: string;
};

const FIELDS = ["customerName", "city", "plan", "amount", "title"];

export default function Automations() {
  const [rules, setRules] = useState<Automation[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, r] = await Promise.all([
      supabase
        .from("ss_automations")
        .select("id,name,description,trigger_event,conditions,actions,delay_minutes,active,run_count,last_run_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("ss_automation_runs")
        .select("id,automation_id,trigger_event,subject_label,status,detail,created_at")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    setRules((a.data ?? []) as unknown as Automation[]);
    setRuns((r.data ?? []) as Run[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    const { data, error } = await supabase
      .from("ss_automations")
      .insert({ name: "New automation", trigger_event: "visit_completed" })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    await load();
    setOpenId(data.id);
  }

  async function patch(id: string, values: Partial<Automation>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await supabase.from("ss_automations").update(values as never).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function remove(id: string) {
    await supabase.from("ss_automations").delete().eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  const setCondition = (rule: Automation, index: number, patchValue: Partial<Condition>) => {
    const next = rule.conditions.map((c, i) => (i === index ? { ...c, ...patchValue } : c));
    void patch(rule.id, { conditions: next });
  };

  const setAction = (rule: Automation, index: number, patchValue: Partial<Action>) => {
    const next = rule.actions.map((a, i) => (i === index ? { ...a, ...patchValue } : a));
    void patch(rule.id, { actions: next });
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Workflow Automations" sub="When this happens → do that, automatically" />

      <button className="ss-btn" onClick={() => void create()}>
        <Plus size={13} /> New automation
      </button>

      {loading && <EmptyState>Loading automations…</EmptyState>}
      {!loading && !rules.length && <EmptyState>No automations yet.</EmptyState>}

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="ss-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="flex items-center gap-2 text-left"
                onClick={() => setOpenId(openId === rule.id ? null : rule.id)}>
                <Workflow size={14} />
                <span>
                  <span className="block text-[0.9rem] font-semibold">{rule.name}</span>
                  <span className="block text-[0.7rem] opacity-70">
                    {TRIGGERS.find((t) => t.key === rule.trigger_event)?.label ?? rule.trigger_event} ·{" "}
                    {rule.actions?.length ?? 0} action(s) · ran {rule.run_count}×
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                <Chip tone={rule.active ? "green" : "ink"}>{rule.active ? "on" : "paused"}</Chip>
                <button className="ss-btn ss-btn-ghost" onClick={() => void patch(rule.id, { active: !rule.active })}>
                  <Power size={13} />
                </button>
                <button className="ss-btn ss-btn-ghost" onClick={() => void remove(rule.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {openId === rule.id && (
              <div className="mt-3 space-y-4 border-t pt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Name
                    <input className="ss-input mt-1 w-full" value={rule.name}
                      onChange={(e) => patch(rule.id, { name: e.target.value })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    When
                    <select className="ss-input mt-1 w-full" value={rule.trigger_event}
                      onChange={(e) => patch(rule.id, { trigger_event: e.target.value })}>
                      {TRIGGERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[0.72rem] uppercase tracking-wide opacity-70">Only if</h4>
                    <button className="ss-btn ss-btn-ghost"
                      onClick={() => patch(rule.id, {
                        conditions: [...(rule.conditions ?? []), { field: "city", op: "eq", value: "" }],
                      })}>
                      <Plus size={12} /> Condition
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {(rule.conditions ?? []).map((c, i) => (
                      <div key={i} className="grid gap-1.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
                        <select className="ss-input" value={c.field}
                          onChange={(e) => setCondition(rule, i, { field: e.target.value })}>
                          {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select className="ss-input" value={c.op}
                          onChange={(e) => setCondition(rule, i, { op: e.target.value as Condition["op"] })}>
                          {OPERATORS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                        <input className="ss-input" value={c.value}
                          onChange={(e) => setCondition(rule, i, { value: e.target.value })} />
                        <button className="ss-btn ss-btn-ghost"
                          onClick={() => patch(rule.id, { conditions: rule.conditions.filter((_, x) => x !== i) })}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {!(rule.conditions ?? []).length && (
                      <p className="text-[0.72rem] opacity-60">No conditions — runs every time.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[0.72rem] uppercase tracking-wide opacity-70">Then</h4>
                    <button className="ss-btn ss-btn-ghost"
                      onClick={() => patch(rule.id, {
                        actions: [...(rule.actions ?? []), { type: "sms", text: "Hi {customerName}, " }],
                      })}>
                      <Plus size={12} /> Action
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(rule.actions ?? []).map((a, i) => (
                      <div key={i} className="grid gap-1.5 border p-2">
                        <div className="flex gap-1.5">
                          <select className="ss-input flex-1" value={a.type}
                            onChange={(e) => setAction(rule, i, { type: e.target.value as Action["type"] })}>
                            {ACTIONS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                          </select>
                          <button className="ss-btn ss-btn-ghost"
                            onClick={() => patch(rule.id, { actions: rule.actions.filter((_, x) => x !== i) })}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {a.type !== "sms" && (
                          <input className="ss-input" placeholder="Title" value={a.title ?? ""}
                            onChange={(e) => setAction(rule, i, { title: e.target.value })} />
                        )}
                        <textarea className="ss-input" rows={2}
                          placeholder="Message — use {customerName}, {amount}, {city}"
                          value={a.text ?? ""} onChange={(e) => setAction(rule, i, { text: e.target.value })} />
                        {a.type === "create_job" && (
                          <input className="ss-input" type="number" min={0} placeholder="Price"
                            value={a.price ?? 0} onChange={(e) => setAction(rule, i, { price: Number(e.target.value) || 0 })} />
                        )}
                      </div>
                    ))}
                    {!(rule.actions ?? []).length && <p className="text-[0.72rem] opacity-60">Add at least one action.</p>}
                  </div>
                </div>

                {rule.last_run_at && (
                  <p className="text-[0.72rem] opacity-70">
                    Last ran {new Date(rule.last_run_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[0.75rem] uppercase tracking-wide opacity-70">
          <Play size={12} /> Recent runs
        </h3>
        {!runs.length && <EmptyState>Nothing has fired yet.</EmptyState>}
        <div className="space-y-1.5">
          {runs.map((r) => (
            <div key={r.id} className="ss-card flex flex-wrap items-center justify-between gap-2 p-2.5 text-[0.75rem]">
              <span>
                <strong>{rules.find((x) => x.id === r.automation_id)?.name ?? "Automation"}</strong>
                {r.subject_label ? ` · ${r.subject_label}` : ""} — {r.detail}
              </span>
              <span className="flex items-center gap-1.5">
                <Chip tone={r.status === "ok" ? "green" : "orange"}>{r.status}</Chip>
                <span className="opacity-60">{new Date(r.created_at).toLocaleString()}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
