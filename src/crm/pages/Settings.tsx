import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

type Row = { key: string; value: Record<string, unknown> };

export default function Settings() {
  const { level } = useSavvyIdentity();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("ss_settings").select("key,value").order("key").then(({ data }) => {
      const list = (data ?? []) as Row[];
      setRows(list);
      setDraft(Object.fromEntries(list.map((r) => [r.key, JSON.stringify(r.value, null, 2)])));
    });
  }, []);

  async function save(key: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft[key] ?? "");
    } catch {
      { toast.error("Invalid JSON"); return; }
    }
    const { error } = await supabase.from("ss_settings").update({ value: parsed as never }).eq("key", key);
    if (error) { toast.error(error.message); return; }
    toast.success(`${key} saved`);
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Settings" sub="Company profile, chemical costs, and route automation" />
      {level !== "owner" && (
        <div className="ss-card p-3 text-[0.82rem] opacity-75">Read-only — only the owner can change settings.</div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="ss-card p-4">
            <div className="ss-label mb-2">{r.key.replace(/_/g, " ")}</div>
            <textarea
              className="ss-input ss-num"
              rows={10}
              readOnly={level !== "owner"}
              value={draft[r.key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })}
            />
            {level === "owner" && (
              <button className="ss-btn mt-2" onClick={() => save(r.key)}>Save</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
