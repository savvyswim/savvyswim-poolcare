import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, RefreshCw, Send, UserCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

type Thread = {
  id: string;
  customer_id: string | null;
  phone: string;
  display_name: string | null;
  assigned_staff_id: string | null;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_preview: string | null;
};

type Message = {
  id: string;
  direction: string;
  body: string;
  status: string;
  created_at: string;
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

export default function Inbox() {
  const id = useSavvyIdentity();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const [t, s] = await Promise.all([
      supabase
        .from("ss_sms_threads")
        .select("id,customer_id,phone,display_name,assigned_staff_id,status,unread_count,last_message_at,last_preview")
        .order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase.from("ss_staff").select("id,full_name").eq("is_active", true).order("full_name"),
    ]);
    setThreads((t.data ?? []) as Thread[]);
    setStaff((s.data ?? []) as { id: string; full_name: string }[]);
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from("ss_sms_messages")
      .select("id,direction,body,status,created_at")
      .eq("thread_id", threadId)
      .order("created_at");
    setMessages((data ?? []) as Message[]);
    await supabase.from("ss_sms_threads").update({ unread_count: 0 }).eq("id", threadId);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t)));
  }, []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);
  useEffect(() => { if (openId) void loadMessages(openId); }, [openId, loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  // Live updates so a reply lands in the inbox without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel("sms-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "ss_sms_messages" }, () => {
        void loadThreads();
        if (openId) void loadMessages(openId);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [openId, loadThreads, loadMessages]);

  const open = threads.find((t) => t.id === openId) ?? null;
  const unreadTotal = useMemo(() => threads.reduce((s, t) => s + (t.unread_count ?? 0), 0), [threads]);

  async function send() {
    if (!openId || !draft.trim()) return;
    setSending(true);
    try {
      const { sendThreadSms } = await import("@/lib/sms.functions");
      await sendThreadSms({ data: { threadId: openId, body: draft.trim() } });
      setDraft("");
      await loadMessages(openId);
      await loadThreads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the text");
    }
    setSending(false);
  }

  async function startNew() {
    if (!newPhone.trim()) return;
    try {
      const { startThread } = await import("@/lib/sms.functions");
      const res = await startThread({ data: { phone: newPhone.trim() } });
      setNewPhone("");
      await loadThreads();
      setOpenId(res.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the conversation");
    }
  }

  async function assign(threadId: string, staffId: string) {
    const value = staffId || null;
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, assigned_staff_id: value } : t)));
    const { error } = await supabase.from("ss_sms_threads").update({ assigned_staff_id: value }).eq("id", threadId);
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Text Inbox"
        sub={unreadTotal ? `${unreadTotal} unread` : "Two-way SMS with your customers"}
      />

      {id.isOffice && (
        <div className="flex gap-1.5">
          <input className="ss-input flex-1" placeholder="Start a new text: (469) 555-0142"
            value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <button className="ss-btn" onClick={() => void startNew()}>
            <MessageSquare size={13} /> Start
          </button>
          <button className="ss-btn ss-btn-ghost" onClick={() => void loadThreads()}>
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-1.5">
          {!threads.length && <EmptyState>No conversations yet.</EmptyState>}
          {threads.map((t) => (
            <button key={t.id} onClick={() => setOpenId(t.id)}
              className={`ss-card w-full p-2.5 text-left ${openId === t.id ? "ring-1" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.82rem] font-semibold">{t.display_name ?? t.phone}</span>
                {t.unread_count > 0 && <Chip tone="orange">{t.unread_count} new</Chip>}
              </div>
              <div className="truncate text-[0.7rem] opacity-70">{t.last_preview ?? "No messages yet"}</div>
              <div className="mt-0.5 text-[0.65rem] opacity-55">{when(t.last_message_at)}</div>
            </button>
          ))}
        </div>

        <div className="ss-card flex min-h-[24rem] flex-col p-3">
          {!open && <EmptyState>Pick a conversation.</EmptyState>}
          {open && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div>
                  <div className="text-[0.9rem] font-semibold">{open.display_name ?? open.phone}</div>
                  <div className="text-[0.7rem] opacity-70">{open.phone}</div>
                </div>
                {id.isOffice && (
                  <label className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide opacity-70">
                    <UserCog size={12} /> Assigned tech
                    <select className="ss-input" value={open.assigned_staff_id ?? ""}
                      onChange={(e) => void assign(open.id, e.target.value)}>
                      <option value="">Office only</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto py-3">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[80%] p-2 text-[0.8rem] ${
                    m.direction === "out" ? "ml-auto bg-primary/10" : "bg-muted"
                  }`}>
                    <p className="whitespace-pre-line">{m.body}</p>
                    <div className="mt-1 text-[0.62rem] opacity-60">
                      {when(m.created_at)} · {m.status}
                    </div>
                  </div>
                ))}
                {!messages.length && <EmptyState>No messages in this thread yet.</EmptyState>}
                <div ref={endRef} />
              </div>

              <div className="flex gap-1.5 border-t pt-2">
                <textarea className="ss-input flex-1" rows={2} value={draft} maxLength={1200}
                  placeholder="Write a text…" onChange={(e) => setDraft(e.target.value)} />
                <button className="ss-btn" disabled={sending || !draft.trim()} onClick={() => void send()}>
                  <Send size={13} /> {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
