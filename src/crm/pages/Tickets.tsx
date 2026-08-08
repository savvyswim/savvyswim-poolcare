import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

type Ticket = {
  id: string;
  customer_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  last_message_at: string;
};

type Message = {
  id: string;
  ticket_id: string;
  author_kind: string;
  author_label: string | null;
  body: string;
  created_at: string;
};

const STATUSES = ["new", "open", "answered", "closed"];

export default function Tickets() {
  const { staffName } = useSavvyIdentity();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("open");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ss_tickets")
      .select("id,customer_id,subject,category,status,priority,created_at,last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(300);
    const rows = (data as Ticket[]) ?? [];
    setTickets(rows);
    const ids = [...new Set(rows.map((r) => r.customer_id))];
    if (ids.length) {
      const { data: custs } = await supabase
        .from("ss_customers")
        .select("id,full_name")
        .in("id", ids);
      const map: Record<string, string> = {};
      for (const c of (custs as { id: string; full_name: string }[]) ?? []) map[c.id] = c.full_name;
      setNames(map);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from("ss_ticket_messages")
      .select("id,ticket_id,author_kind,author_label,body,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((m) => ({ ...m, [ticketId]: (data as Message[]) ?? [] }));
  }, []);

  const shown = useMemo(
    () => (filter === "all" ? tickets : filter === "open" ? tickets.filter((t) => t.status !== "closed") : tickets.filter((t) => t.status === filter)),
    [tickets, filter],
  );

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("ss_tickets").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update the ticket.");
      return;
    }
    await load();
  }

  async function sendReply(ticketId: string) {
    if (!reply.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("ss_ticket_messages").insert({
      ticket_id: ticketId,
      author_kind: "staff",
      author_label: staffName ?? "Savvy Swim",
      body: reply.trim(),
    });
    if (!error) {
      await supabase
        .from("ss_tickets")
        .update({ status: "answered", last_message_at: new Date().toISOString() })
        .eq("id", ticketId);
    }
    setBusy(false);
    if (error) {
      toast.error("Could not send the reply.");
      return;
    }
    setReply("");
    await loadMessages(ticketId);
    await load();
  }

  return (
    <div className="crm-page">
      <header className="mb-6">
        <h1 className="crm-h1 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Customer Tickets
        </h1>
        <p className="crm-sub">Messages sent by customers from their account portal.</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {["open", ...STATUSES, "all"].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
              filter === s ? "border-transparent bg-[hsl(var(--crm-accent,0_0%_20%))] text-white" : "border-black/15"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="divide-y divide-black/10 border border-black/10 bg-white">
        {shown.length === 0 && <p className="p-5 text-sm opacity-60">No tickets here.</p>}
        {shown.map((t) => {
          const isOpen = openId === t.id;
          return (
            <article key={t.id}>
              <button
                type="button"
                onClick={() => {
                  const next = isOpen ? null : t.id;
                  setOpenId(next);
                  if (next) void loadMessages(next);
                }}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t.subject}</p>
                  <p className="text-xs opacity-60">
                    {names[t.customer_id] ?? "Customer"} · {t.category} ·{" "}
                    {new Date(t.last_message_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{t.status}</span>
              </button>
              {isOpen && (
                <div className="border-t border-black/10 p-4">
                  <div className="space-y-3">
                    {(messages[t.id] ?? []).map((m) => (
                      <div
                        key={m.id}
                        className={`border-l-2 pl-3 ${m.author_kind === "staff" ? "border-black/60" : "border-black/20"}`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.12em] opacity-60">
                          {m.author_kind === "staff" ? m.author_label || "Savvy Swim" : names[t.customer_id] ?? "Customer"} ·{" "}
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Reply to the customer…"
                      className="flex-1 border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void sendReply(t.id)}
                      className="inline-flex items-center gap-2 bg-black px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void setStatus(t.id, s)}
                        className="border border-black/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]"
                      >
                        Mark {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
