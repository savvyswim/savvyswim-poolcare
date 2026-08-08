import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";

type FeedRow = {
  id: string; kind: string; title: string; body: string | null;
  sent_by_sms: boolean; created_at: string; customer_id: string | null;
  ss_customers: { full_name: string; email: string | null } | null;
};

const FREEZE_BODY = `A hard freeze is headed our way. Please protect your pool equipment tonight:

1. LEAVE YOUR PUMP RUNNING 24/7 until temperatures stay above freezing. Moving water does not freeze. This is the single most important step.
2. Do NOT shut off the breaker to the pool equipment.
3. Open all valves and set your system to circulate normally.
4. Run any spa, waterfall, or water feature lines for a few minutes each hour, or leave them circulating.
5. Keep the water level at normal height — skimmers crack when the level drops.
6. If you lose power, drain the pump, filter, and heater so trapped water cannot expand and crack the housings.
7. Remove and store any exposed cleaner or floating chlorinator.

If your equipment stops running, ices over, or you hear it straining, call us right away at (469) 744-0379 — do not restart it yourself.

We may reschedule routes during the freeze for our techs' safety. Your service day will be made up as soon as roads are clear, at no extra charge.

On duty, so you don't have to be.
— Savvy Swim`;

const TEMPLATES = [
  { id: "welcome", title: "Welcome to Savvy Swim", body: "Your service starts this week. Your tech will text on the way." },
  { id: "reminder", title: "Service tomorrow", body: "Please unlock the gate and secure pets before your visit." },
  { id: "green", title: "Green pool recovery plan", body: "Here's the clean-up plan and timeline for your pool." },
  { id: "invoice", title: "Invoice ready", body: "Your monthly invoice is available in your portal." },
  { id: "freeze", title: "FREEZE WARNING — protect your pool tonight", body: FREEZE_BODY },
];


export default function EmailCenter() {
  const [template, setTemplate] = useState(TEMPLATES[0]!);
  const [subject, setSubject] = useState(TEMPLATES[0]!.title);
  const [body, setBody] = useState(TEMPLATES[0]!.body);
  const [audience, setAudience] = useState<"all" | "routed" | "leads">("all");
  const [sending, setSending] = useState(false);

  const { rows: feed } = useTable<FeedRow>("feed", async () => {
    const { data } = await supabase
      .from("ss_feed")
      .select("id,kind,title,body,sent_by_sms,created_at,customer_id,ss_customers(full_name,email)")
      .order("created_at", { ascending: false })
      .limit(40);
    return (data ?? []) as unknown as FeedRow[];
  });

  const { rows: customers } = useTable<{ id: string; email: string | null; status: string; assigned_tech_id: string | null }>(
    "email-customers",
    async () => {
      const { data } = await supabase.from("ss_customers").select("id,email,status,assigned_tech_id");
      return data ?? [];
    },
  );

  const recipients = useMemo(() => {
    if (audience === "leads") return [];
    return customers.filter((c) => c.email && c.status === "active" && (audience === "all" || c.assigned_tech_id));
  }, [customers, audience]);

  async function send() {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body are required"); return; }
    setSending(true);
    const { error } = await supabase.functions.invoke("send-campaign-email", {
      body: { subject, body, customerIds: recipients.map((r) => r.id) },
    });
    setSending(false);
    if (error) { toast.error("Send failed — check the email function logs"); return; }
    toast.success(`Queued for ${recipients.length} recipients`);
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Email center" sub="Templates, campaigns, and the customer activity feed" />

      <div
        className="ss-card flex flex-wrap items-center gap-3 p-4"
        style={{ borderColor: "hsl(var(--ss-aqua))", background: "hsl(var(--ss-aqua) / 0.08)" }}
      >
        <Snowflake size={20} style={{ color: "hsl(var(--ss-aqua))" }} />
        <div className="min-w-[220px] flex-1">
          <div className="text-[0.9rem] font-semibold">Freeze warning blast</div>
          <div className="text-[0.75rem] opacity-70">
            Hard freeze coming? Send every active customer the pump-runs-24/7 equipment protection notice.
          </div>
        </div>
        <button
          className="ss-btn"
          onClick={() => {
            const t = TEMPLATES.find((x) => x.id === "freeze")!;
            setTemplate(t);
            setSubject(t.title);
            setBody(t.body);
            setAudience("all");
            toast.info("Freeze warning loaded — review it, then send.");
          }}
        >
          Load freeze warning
        </button>
      </div>


      <MarketingImport />

      <div className="grid gap-3 lg:grid-cols-2">

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Compose</div>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`ss-btn ${template.id === t.id ? "" : "ss-btn-ghost"}`}
                onClick={() => { setTemplate(t); setSubject(t.title); setBody(t.body); }}
              >
                {t.title}
              </button>
            ))}
          </div>
          <label className="ss-label">Audience</label>
          <select className="ss-input" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
            <option value="all">All active customers</option>
            <option value="routed">Routed customers only</option>
            <option value="leads">Open leads</option>
          </select>
          <label className="ss-label mt-2.5">Subject</label>
          <input className="ss-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label className="ss-label mt-2.5">Body</label>
          <textarea className="ss-input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="ss-btn mt-3 w-full" disabled={sending || !recipients.length} onClick={send}>
            {sending ? "Sending…" : `Send to ${recipients.length} recipients`}
          </button>
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Customer activity feed</div>
          <div className="space-y-2">
            {!feed.length && <EmptyState>No activity yet.</EmptyState>}
            {feed.map((f) => (
              <div key={f.id} className="border-b pb-2 last:border-0" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone={f.kind === "report" ? "green" : "aqua"}>{f.kind}</Chip>
                  <span className="text-[0.84rem] font-semibold">{f.title}</span>
                  {f.sent_by_sms && <Chip tone="gold">SMS</Chip>}
                </div>
                <div className="text-[0.72rem] opacity-60">
                  {f.ss_customers?.full_name ?? "—"} · {new Date(f.created_at).toLocaleString()}
                </div>
                {f.body && <div className="mt-0.5 text-[0.8rem]">{f.body}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
