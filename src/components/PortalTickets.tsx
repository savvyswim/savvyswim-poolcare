import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
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

const CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "service", label: "Service / schedule" },
  { value: "repair", label: "Repair request" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Something else" },
];

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

export default function PortalTickets({ customerId }: { customerId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from("ss_tickets")
      .select("id,subject,category,status,created_at,last_message_at")
      .eq("customer_id", customerId)
      .order("last_message_at", { ascending: false });
    setTickets((data as Ticket[]) ?? []);
  }, [customerId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from("ss_ticket_messages")
      .select("id,ticket_id,author_kind,author_label,body,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((m) => ({ ...m, [ticketId]: (data as Message[]) ?? [] }));
  }, []);

  async function submitTicket() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Add a subject and a message.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("ss_tickets")
      .insert({ customer_id: customerId, subject: subject.trim(), category })
      .select("id,subject,category,status,created_at,last_message_at")
      .single();
    if (error || !data) {
      setBusy(false);
      toast.error("Could not send your message.");
      return;
    }
    const { error: msgError } = await supabase
      .from("ss_ticket_messages")
      .insert({ ticket_id: data.id, author_kind: "customer", body: body.trim() });
    setBusy(false);
    if (msgError) {
      toast.error("Could not send your message.");
      return;
    }
    toast.success("Message sent — our team will reply here.");
    setSubject("");
    setBody("");
    setCategory("general");
    await loadTickets();
    setOpenId(data.id);
    await loadMessages(data.id);
  }

  async function sendReply(ticketId: string) {
    if (!reply.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("ss_ticket_messages")
      .insert({ ticket_id: ticketId, author_kind: "customer", body: reply.trim() });
    setBusy(false);
    if (error) {
      toast.error("Could not send your reply.");
      return;
    }
    setReply("");
    await loadMessages(ticketId);
    await loadTickets();
  }

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
        <MessageSquare className="h-4 w-4 text-accent" aria-hidden="true" /> Message Savvy Swim
      </h2>
      <p className="mt-1 font-tech text-xs text-primary/60">
        Send us a note about your pool, your schedule, or your bill. Replies land right here.
      </p>

      <div className="mt-4 border border-hairline p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-tech text-xs uppercase tracking-[0.14em] text-primary/60">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="Pump sounds loud"
              className="mt-1 w-full border border-primary/20 bg-transparent p-2.5 font-tech text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="font-tech text-xs uppercase tracking-[0.14em] text-primary/60">Topic</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border border-primary/20 bg-transparent p-2.5 font-tech text-sm outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="font-tech text-xs uppercase tracking-[0.14em] text-primary/60">Message</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Tell us what's going on…"
            className="mt-1 w-full border border-primary/20 bg-transparent p-2.5 font-tech text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submitTicket()}
          className="btn-quote mt-3 inline-flex items-center gap-2 px-5 py-3 text-[12px] font-bold uppercase tracking-wide disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Send message
        </button>
      </div>

      <div className="mt-4 divide-y divide-primary/10 border border-hairline">
        {tickets.length === 0 && (
          <p className="p-5 font-tech text-sm text-primary/60">No messages yet.</p>
        )}
        {tickets.map((t) => {
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
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              >
                <div className="min-w-0">
                  <p className="font-tech text-sm font-semibold">{t.subject}</p>
                  <p className="font-tech text-xs text-primary/60">
                    {new Date(t.last_message_at).toLocaleString()} · {t.category}
                  </p>
                </div>
                <span className="font-tech text-[11px] uppercase tracking-[0.14em] text-accent">
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-primary/10 p-5">
                  <div className="space-y-3">
                    {(messages[t.id] ?? []).map((m) => (
                      <div
                        key={m.id}
                        className={m.author_kind === "staff" ? "border-l-2 border-accent pl-3" : "border-l-2 border-primary/20 pl-3"}
                      >
                        <p className="font-tech text-[11px] uppercase tracking-[0.14em] text-primary/50">
                          {m.author_kind === "staff" ? m.author_label || "Savvy Swim" : "You"} ·{" "}
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-tech text-sm">{m.body}</p>
                      </div>
                    ))}
                  </div>
                  {t.status !== "closed" && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a reply…"
                        className="flex-1 border border-primary/20 bg-transparent p-2.5 font-tech text-sm outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void sendReply(t.id)}
                        className="btn-quote px-5 py-3 text-[12px] font-bold uppercase tracking-wide disabled:opacity-50"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
