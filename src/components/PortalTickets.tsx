import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Inbox, MessageSquare, Plus, Send } from "lucide-react";
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

const QUICK_REPLIES = [
  "Thanks — that works for me.",
  "Can we move this to another day?",
  "Please call me about this.",
  "Still seeing the issue.",
];

const READ_KEY = "savvy_portal_thread_reads";

function loadReads(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(READ_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export default function PortalTickets({ customerId }: { customerId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setReads(loadReads()), []);

  const markRead = useCallback((ticketId: string) => {
    setReads((prev) => {
      const next = { ...prev, [ticketId]: new Date().toISOString() };
      try {
        window.localStorage.setItem(READ_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

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

  function isUnread(t: Ticket) {
    const seen = reads[t.id];
    if (t.status !== "answered" && t.status !== "open") return false;
    if (!seen) return t.status === "answered";
    return new Date(t.last_message_at).getTime() > new Date(seen).getTime();
  }

  const unreadCount = useMemo(() => tickets.filter(isUnread).length, [tickets, reads]);

  function openThread(id: string) {
    setOpenId(id);
    setComposing(false);
    markRead(id);
    void loadMessages(id);
  }

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
    openThread(data.id);
  }

  async function sendReply(ticketId: string, text?: string) {
    const value = (text ?? reply).trim();
    if (!value) return;
    setBusy(true);
    const { error } = await supabase
      .from("ss_ticket_messages")
      .insert({ ticket_id: ticketId, author_kind: "customer", body: value });
    setBusy(false);
    if (error) {
      toast.error("Could not send your reply.");
      return;
    }
    setReply("");
    markRead(ticketId);
    await loadMessages(ticketId);
    await loadTickets();
  }

  const activeTicket = tickets.find((t) => t.id === openId) ?? null;
  const thread = openId ? messages[openId] ?? [] : [];

  function deliveryState(m: Message, all: Message[]) {
    if (m.author_kind !== "customer") return null;
    const seen = all.some(
      (x) => x.author_kind === "staff" && new Date(x.created_at).getTime() > new Date(m.created_at).getTime(),
    );
    return seen ? { label: "Read by team", icon: CheckCheck } : { label: "Sent", icon: Check };
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
            <MessageSquare className="h-4 w-4 text-accent" aria-hidden="true" /> Message center
            {unreadCount > 0 && (
              <span className="bg-accent px-2 py-0.5 font-tech text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="mt-1 font-tech text-xs text-primary/60">
            Your inbox with the Savvy Swim team — service, schedule, billing and repairs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setComposing((c) => !c);
            setOpenId(null);
          }}
          className="btn-quote inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide"
        >
          <Plus className="h-3.5 w-3.5" /> New message
        </button>
      </div>

      {composing && (
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
      )}

      <div className="mt-4 grid gap-0 border border-hairline md:grid-cols-[minmax(0,320px)_1fr]">
        {/* Inbox */}
        <div className="divide-y divide-primary/10 border-b border-primary/10 md:border-b-0 md:border-r">
          <p className="flex items-center gap-2 p-3 font-tech text-[11px] uppercase tracking-[0.14em] text-primary/50">
            <Inbox className="h-3.5 w-3.5" /> Inbox ({tickets.length})
          </p>
          {tickets.length === 0 && <p className="p-5 font-tech text-sm text-primary/60">No messages yet.</p>}
          {tickets.map((t) => {
            const unread = isUnread(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openThread(t.id)}
                className={`flex w-full items-start gap-3 p-4 text-left ${
                  openId === t.id ? "bg-primary/5" : ""
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 ${unread ? "bg-accent" : "bg-primary/20"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-tech text-sm ${unread ? "font-bold" : "font-semibold"}`}>
                    {t.subject}
                  </span>
                  <span className="mt-0.5 block font-tech text-[11px] text-primary/55">
                    {new Date(t.last_message_at).toLocaleString()} · {t.category}
                  </span>
                </span>
                <span className="shrink-0 font-tech text-[10px] uppercase tracking-[0.14em] text-accent">
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className="p-5">
          {!activeTicket && (
            <p className="font-tech text-sm text-primary/60">
              Select a conversation to read it, or start a new message.
            </p>
          )}
          {activeTicket && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-3">
                <p className="font-tech text-sm font-bold">{activeTicket.subject}</p>
                <span className="font-tech text-[11px] uppercase tracking-[0.14em] text-accent">
                  {STATUS_LABEL[activeTicket.status] ?? activeTicket.status}
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {thread.map((m) => {
                  const state = deliveryState(m, thread);
                  const StateIcon = state?.icon;
                  return (
                    <div
                      key={m.id}
                      className={
                        m.author_kind === "staff"
                          ? "border-l-2 border-accent pl-3"
                          : "border-l-2 border-primary/20 pl-3"
                      }
                    >
                      <p className="font-tech text-[11px] uppercase tracking-[0.14em] text-primary/50">
                        {m.author_kind === "staff" ? m.author_label || "Savvy Swim" : "You"} ·{" "}
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-tech text-sm">{m.body}</p>
                      {state && StateIcon && (
                        <p className="mt-1 flex items-center gap-1 font-tech text-[10px] uppercase tracking-[0.14em] text-primary/45">
                          <StateIcon className="h-3 w-3" /> {state.label}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeTicket.status !== "closed" && (
                <div className="mt-5">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={busy}
                        onClick={() => void sendReply(activeTicket.id, q)}
                        className="border border-primary/20 px-3 py-1.5 font-tech text-[11px] hover:border-primary disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void sendReply(activeTicket.id);
                      }}
                      placeholder="Write a reply…"
                      className="flex-1 border border-primary/20 bg-transparent p-2.5 font-tech text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void sendReply(activeTicket.id)}
                      className="btn-quote inline-flex items-center gap-2 px-5 py-3 text-[12px] font-bold uppercase tracking-wide disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Reply
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
