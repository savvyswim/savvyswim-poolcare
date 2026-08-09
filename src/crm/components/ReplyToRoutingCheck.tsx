import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_REPLY_TO_SETTINGS,
  REPLY_TO_SETTINGS_KEY,
  type ReplyToRoutingSettings,
} from "@/lib/email-config";
import { checkReplyToRouting, type ReplyToCheckResult } from "@/lib/email-routing.functions";

const DOT: Record<string, string> = {
  ok: "#1FA9BE",
  warning: "#C98A12",
  fail: "#8E1F2C",
  failing: "#8E1F2C",
};

export default function ReplyToRoutingCheck({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<ReplyToRoutingSettings>(DEFAULT_REPLY_TO_SETTINGS);
  const [result, setResult] = useState<ReplyToCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useServerFn(checkReplyToRouting);

  useEffect(() => {
    void supabase
      .from("ss_settings")
      .select("value")
      .eq("key", REPLY_TO_SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value)
          setSettings({
            ...DEFAULT_REPLY_TO_SETTINGS,
            ...(data.value as Partial<ReplyToRoutingSettings>),
          });
      });
  }, []);

  async function save(next: ReplyToRoutingSettings) {
    setSettings(next);
    const { error } = await supabase
      .from("ss_settings")
      .upsert({ key: REPLY_TO_SETTINGS_KEY, value: next as never }, { onConflict: "key" });
    if (error) toast.error(error.message);
  }

  async function verify() {
    setBusy(true);
    try {
      const res = await run({ data: {} });
      setResult(res);
      if (res.status === "ok") toast.success("Reply-to routing is healthy");
      else if (res.status === "warning") toast.warning("Reply-to routing needs a look");
      else toast.error(res.alerted ? "Replies are bouncing — alert sent" : "Replies are bouncing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  const last = result?.status ?? settings.last_status ?? null;

  return (
    <div className="ss-card p-4">
      <div className="ss-label mb-1">Reply-to routing (customer replies)</div>
      <p className="text-[0.82rem] opacity-75">
        Confirms the reply address on every customer email is a live mailbox and that nothing sent
        to it is bouncing. Alerts you by email when it breaks.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="ss-label">Reply-to address</span>
          <input
            className="ss-input"
            value={settings.address}
            disabled={!canEdit}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            onBlur={() => void save(settings)}
          />
        </label>
        <label className="block">
          <span className="ss-label">Send alerts to (blank = office list)</span>
          <input
            className="ss-input"
            placeholder="you@savvyswim.com"
            value={settings.alert_email}
            disabled={!canEdit}
            onChange={(e) => setSettings({ ...settings, alert_email: e.target.value })}
            onBlur={() => void save(settings)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="ss-btn" disabled={!canEdit || busy} onClick={() => void verify()}>
          {busy ? "Checking…" : "Verify reply-to routing"}
        </button>
        <label className="flex items-center gap-2 text-[0.82rem]">
          <input
            type="checkbox"
            checked={settings.alert_enabled}
            disabled={!canEdit}
            onChange={(e) => void save({ ...settings, alert_enabled: e.target.checked })}
          />
          Email me when replies bounce
        </label>
        {last && (
          <span className="flex items-center gap-2 text-[0.8rem]">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ background: DOT[last] ?? "#999" }}
              aria-hidden
            />
            {last === "ok" ? "Healthy" : last === "warning" ? "Needs attention" : "Failing"}
            {settings.last_checked_at && !result
              ? ` · last checked ${new Date(settings.last_checked_at).toLocaleString()}`
              : ""}
          </span>
        )}
      </div>

      {result && (
        <ul className="mt-4 space-y-2">
          {result.items.map((i) => (
            <li key={i.id} className="flex gap-2 text-[0.82rem]">
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0"
                style={{ background: DOT[i.status] }}
                aria-hidden
              />
              <span>
                <strong>{i.label}:</strong> {i.detail}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!canEdit && <p className="mt-2 text-[0.78rem] opacity-60">Only the owner can run this.</p>}
    </div>
  );
}
