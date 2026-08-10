import { useCallback, useEffect, useState } from "react";
import { Loader2, PlugZap, RefreshCw, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Chip } from "@/crm/components/Brand";
import { simulateAppointmentWebhook } from "@/lib/webhook-test.functions";

const STATUSES = [
  "scheduled",
  "rescheduled",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "no_access",
  "canceled",
] as const;

type EventRow = {
  id: string;
  event_id: string;
  status: string;
  customer_email: string | null;
  customer_phone: string | null;
  notified_email: boolean;
  notified_sms: boolean;
  error: string | null;
  created_at: string;
};

const when = (v: string) =>
  new Date(v).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const field =
  "w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink";

export default function WebhookTester() {
  const run = useServerFn(simulateAppointmentWebhook);
  const [status, setStatus] = useState<string>("on_the_way");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("Test Customer");
  const [tech, setTech] = useState("Marcus");
  const [window_, setWindow] = useState("10:00a – 12:00p");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [wantEmail, setWantEmail] = useState(true);
  const [wantSms, setWantSms] = useState(false);
  const [auth, setAuth] = useState<"signature" | "bearer" | "none">("signature");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    status: number;
    eventId: string;
    url: string;
    requestBody: string;
    response: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    const { data } = await supabase
      .from("ss_appointment_webhook_events")
      .select("id,event_id,status,customer_email,customer_phone,notified_email,notified_sms,error,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setRows((data ?? []) as unknown as EventRow[]);
    setLoadingRows(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const send = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const channels = [wantEmail ? "email" : null, wantSms ? "sms" : null].filter(
        Boolean,
      ) as string[];
      const res = await run({
        data: {
          status,
          email: email || null,
          phone: phone || null,
          customerName: name || null,
          technician: tech || null,
          arrivalWindow: window_ || null,
          scheduledDate: date || null,
          message: message || null,
          channels,
          auth,
        },
      });
      setResult(res);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <PlugZap className="h-5 w-5" />
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide">Webhook tester</h1>
          <p className="text-sm text-ink/60">
            Fire a signed CRM appointment-status event at the live endpoint and confirm the
            email/SMS notification actually goes out.
          </p>
        </div>
      </header>

      <section className="grid gap-4 border border-ink/15 bg-cream p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Status</span>
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Auth mode</span>
          <select
            className={field}
            value={auth}
            onChange={(e) => setAuth(e.target.value as typeof auth)}
          >
            <option value="signature">HMAC signature (production path)</option>
            <option value="bearer">Bearer token</option>
            <option value="none">No auth (expect 401)</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Customer name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Technician</span>
          <input className={field} value={tech} onChange={(e) => setTech(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Email</span>
          <input
            className={field}
            type="email"
            maxLength={255}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Phone</span>
          <input
            className={field}
            maxLength={20}
            placeholder="+12145550123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Scheduled date</span>
          <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/60">Arrival window</span>
          <input className={field} value={window_} onChange={(e) => setWindow(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-ink/60">Message (optional)</span>
          <input
            className={field}
            maxLength={280}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 text-sm md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={wantEmail} onChange={(e) => setWantEmail(e.target.checked)} />
            Send email
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={wantSms} onChange={(e) => setWantSms(e.target.checked)} />
            Send SMS
          </label>
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || (!email && !phone)}
            className="ml-auto inline-flex items-center gap-2 bg-ink px-4 py-2 text-sm uppercase tracking-wide text-cream disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Run test
          </button>
        </div>
      </section>

      {error && (
        <p className="border border-red-600/40 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <section className="space-y-3 border border-ink/15 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{result.ok ? `HTTP ${result.status} OK` : `HTTP ${result.status}`}</Chip>
            <span className="text-xs text-ink/50">{result.eventId}</span>
            <span className="text-xs text-ink/50">{result.url}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50">Request</p>
              <pre className="max-h-64 overflow-auto bg-ink/5 p-3 text-xs">{result.requestBody}</pre>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50">Response</p>
              <pre className="max-h-64 overflow-auto bg-ink/5 p-3 text-xs">{result.response}</pre>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg uppercase tracking-wide">Recent webhook events</h2>
          <button
            type="button"
            onClick={() => void loadRows()}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-ink/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto border border-ink/15">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Status</th>
                <th className="p-2">To</th>
                <th className="p-2">Email</th>
                <th className="p-2">SMS</th>
                <th className="p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink/10">
                  <td className="p-2 whitespace-nowrap">{when(r.created_at)}</td>
                  <td className="p-2">{r.status.replace(/_/g, " ")}</td>
                  <td className="p-2">{r.customer_email ?? r.customer_phone ?? "—"}</td>
                  <td className="p-2">{r.notified_email ? "sent" : "—"}</td>
                  <td className="p-2">{r.notified_sms ? "sent" : "—"}</td>
                  <td className="p-2 text-red-700">{r.error ?? ""}</td>
                </tr>
              ))}
              {!rows.length && !loadingRows && (
                <tr>
                  <td className="p-3 text-ink/50" colSpan={6}>
                    No webhook events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
