import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Template = { id: string; name: string; is_default: boolean; is_active: boolean };

/**
 * Picks which ordered job workflow template a tech runs on this pool.
 * Empty = use the company default template.
 */
export default function CustomerWorkflowPicker({
  customerId,
  canEdit,
}: {
  customerId: string;
  canEdit: boolean;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase
          .from("ss_workflow_templates")
          .select("id,name,is_default,is_active")
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("ss_customers").select("workflow_template_id").eq("id", customerId).maybeSingle(),
      ]);
      setTemplates((t ?? []) as Template[]);
      setValue(((c as { workflow_template_id?: string | null } | null)?.workflow_template_id ?? "") as string);
    })();
  }, [customerId]);

  async function save(next: string) {
    setValue(next);
    const { error } = await supabase
      .from("ss_customers")
      .update({ workflow_template_id: next || null })
      .eq("id", customerId);
    if (error) { toast.error(error.message); return; }
    toast.success("Workflow template updated");
  }

  return (
    <div className="ss-card p-3">
      <div className="ss-label mb-1">Job workflow template</div>
      <select
        className="ss-input w-full"
        value={value}
        disabled={!canEdit}
        onChange={(e) => void save(e.target.value)}
      >
        <option value="">Company default</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.is_default ? " (default)" : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[0.74rem] opacity-65">
        Sets the arriving / in progress / leaving step sequence the tech follows on this pool.
      </p>
    </div>
  );
}
