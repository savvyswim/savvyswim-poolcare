import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { PHASE_LABEL, PHASE_ORDER, type WorkflowPhase } from "@/crm/lib/checklist";

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
};

type TemplateStep = {
  id: string;
  template_id: string;
  phase: WorkflowPhase;
  label: string;
  hint: string | null;
  is_required: boolean;
  photo_required: boolean;
  sort_order: number;
};

/**
 * Job workflow templates: an ordered step sequence per phase
 * (when arriving / in progress / when leaving) that techs run on a visit.
 */
export default function WorkflowTemplates() {
  const { level } = useSavvyIdentity();
  const canEdit = level === "owner" || level === "office_manager";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [steps, setSteps] = useState<TemplateStep[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newStep, setNewStep] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase
        .from("ss_workflow_templates")
        .select("id,name,description,is_active,is_default")
        .order("sort_order")
        .order("name"),
      supabase
        .from("ss_workflow_template_steps")
        .select("id,template_id,phase,label,hint,is_required,photo_required,sort_order")
        .order("sort_order"),
    ]);
    const list = (t ?? []) as Template[];
    setTemplates(list);
    setSteps((s ?? []) as TemplateStep[]);
    setOpenId((cur) => cur ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stepsFor = (templateId: string, phase: WorkflowPhase) =>
    steps
      .filter((x) => x.template_id === templateId && x.phase === phase)
      .sort((a, b) => a.sort_order - b.sort_order);

  async function addTemplate() {
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("ss_workflow_templates")
      .insert({ name, sort_order: templates.length })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    setNewName("");
    setOpenId(data?.id ?? null);
    toast.success("Template created");
    void load();
  }

  async function patchTemplate(id: string, patch: Partial<Template>) {
    const { error } = await supabase.from("ss_workflow_templates").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function makeDefault(id: string) {
    await supabase.from("ss_workflow_templates").update({ is_default: false }).neq("id", id);
    await patchTemplate(id, { is_default: true });
    toast.success("Default template set");
  }

  async function removeTemplate(id: string) {
    if (!confirm("Delete this template and its steps?")) return;
    const { error } = await supabase.from("ss_workflow_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function addStep(templateId: string, phase: WorkflowPhase) {
    const key = `${templateId}:${phase}`;
    const label = (newStep[key] ?? "").trim();
    if (!label) return;
    const existing = stepsFor(templateId, phase);
    const { error } = await supabase.from("ss_workflow_template_steps").insert({
      template_id: templateId,
      phase,
      label,
      sort_order: existing.length,
    });
    if (error) { toast.error(error.message); return; }
    setNewStep((s) => ({ ...s, [key]: "" }));
    void load();
  }

  async function patchStep(id: string, patch: Partial<TemplateStep>) {
    const { error } = await supabase.from("ss_workflow_template_steps").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function removeStep(id: string) {
    const { error } = await supabase.from("ss_workflow_template_steps").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function move(templateId: string, phase: WorkflowPhase, index: number, dir: -1 | 1) {
    const list = stepsFor(templateId, phase);
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("ss_workflow_template_steps").update({ sort_order: target }).eq("id", a.id),
      supabase.from("ss_workflow_template_steps").update({ sort_order: index }).eq("id", b.id),
    ]);
    void load();
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="ss-tag" style={{ fontSize: "0.6rem" }}>Job workflow templates</h2>
        <p className="text-[0.8rem] opacity-70">
          Ordered step sequence a tech runs on every visit — when arriving, in progress, and when leaving.
        </p>
      </div>

      {canEdit && (
        <div className="ss-card flex flex-wrap items-center gap-2 p-3">
          <input
            className="ss-input flex-1"
            placeholder="New template name (e.g. Green pool recovery)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="ss-btn" onClick={() => void addTemplate()}>
            <Plus size={13} /> Add template
          </button>
        </div>
      )}

      {templates.map((t) => {
        const open = openId === t.id;
        const count = steps.filter((s) => s.template_id === t.id).length;
        return (
          <div key={t.id} className="ss-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="text-left"
                onClick={() => setOpenId(open ? null : t.id)}
              >
                <div className="font-semibold">
                  {t.name}
                  {t.is_default && <span className="ss-chip ml-2">Default</span>}
                  {!t.is_active && <span className="ss-chip ml-2">Paused</span>}
                </div>
                <div className="text-[0.75rem] opacity-65">
                  {count} step{count === 1 ? "" : "s"} · {t.description ?? "No description"}
                </div>
              </button>
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  {!t.is_default && (
                    <button className="ss-btn ss-btn-ghost" onClick={() => void makeDefault(t.id)}>
                      Make default
                    </button>
                  )}
                  <button
                    className="ss-btn ss-btn-ghost"
                    onClick={() => void patchTemplate(t.id, { is_active: !t.is_active })}
                  >
                    {t.is_active ? "Pause" : "Activate"}
                  </button>
                  <button className="ss-btn ss-btn-ghost" onClick={() => void removeTemplate(t.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {open && (
              <div className="mt-3 space-y-3">
                {canEdit && (
                  <input
                    className="ss-input w-full"
                    placeholder="Description"
                    defaultValue={t.description ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (t.description ?? "")) void patchTemplate(t.id, { description: v || null });
                    }}
                  />
                )}

                {PHASE_ORDER.map((phase) => {
                  const list = stepsFor(t.id, phase);
                  const key = `${t.id}:${phase}`;
                  return (
                    <div key={phase} className="space-y-1.5">
                      <div className="ss-tag" style={{ fontSize: "0.55rem" }}>{PHASE_LABEL[phase]}</div>
                      {list.length === 0 && (
                        <p className="text-[0.75rem] opacity-55">No steps yet.</p>
                      )}
                      {list.map((s, i) => (
                        <div
                          key={s.id}
                          className="flex flex-wrap items-center gap-2 border p-2 text-[0.8rem]"
                          style={{ borderColor: "hsl(var(--ss-sand))" }}
                        >
                          <span className="ss-num opacity-55">{i + 1}</span>
                          <input
                            className="ss-input min-w-[10rem] flex-1"
                            defaultValue={s.label}
                            disabled={!canEdit}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== s.label) void patchStep(s.id, { label: v });
                            }}
                          />
                          <input
                            className="ss-input min-w-[10rem] flex-1"
                            placeholder="Hint for the tech"
                            defaultValue={s.hint ?? ""}
                            disabled={!canEdit}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (s.hint ?? "")) void patchStep(s.id, { hint: v || null });
                            }}
                          />
                          <label className="flex items-center gap-1 text-[0.72rem]">
                            <input
                              type="checkbox"
                              checked={s.is_required}
                              disabled={!canEdit}
                              onChange={() => void patchStep(s.id, { is_required: !s.is_required })}
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-1 text-[0.72rem]">
                            <input
                              type="checkbox"
                              checked={s.photo_required}
                              disabled={!canEdit}
                              onChange={() => void patchStep(s.id, { photo_required: !s.photo_required })}
                            />
                            Photo
                          </label>
                          {canEdit && (
                            <span className="flex items-center gap-1">
                              <button
                                className="ss-btn ss-btn-ghost"
                                aria-label="Move step up"
                                onClick={() => void move(t.id, phase, i, -1)}
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                className="ss-btn ss-btn-ghost"
                                aria-label="Move step down"
                                onClick={() => void move(t.id, phase, i, 1)}
                              >
                                <ChevronDown size={13} />
                              </button>
                              <button
                                className="ss-btn ss-btn-ghost"
                                aria-label="Delete step"
                                onClick={() => void removeStep(s.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </span>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <input
                            className="ss-input flex-1"
                            placeholder={`Add a ${PHASE_LABEL[phase].toLowerCase()} step`}
                            value={newStep[key] ?? ""}
                            onChange={(e) => setNewStep((s) => ({ ...s, [key]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void addStep(t.id, phase);
                            }}
                          />
                          <button className="ss-btn ss-btn-ghost" onClick={() => void addStep(t.id, phase)}>
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
