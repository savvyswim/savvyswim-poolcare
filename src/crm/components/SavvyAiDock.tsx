import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X, SendHorizontal, Loader2 } from "lucide-react";
import { askSavvyOps } from "@/crm/lib/savvy-ai.functions";

type Msg = { role: "user" | "assistant"; text: string };

const STARTERS = [
  "What should I look at first today?",
  "Draft a text telling a customer their filter needs a clean",
  "How do I read the break-even dashboard?",
  "Chlorine is high and pH is low — what do I dose?",
];

export function SavvyAiDock({ workspace, page }: { workspace: string; page: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const ask = useServerFn(askSavvyOps);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await ask({ data: { workspace, page, question: q, history } });
      setMsgs((m) => [...m, { role: "assistant", text: res.text }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "I couldn't reach the assistant just now. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        className="ss-btn fixed bottom-24 right-4 z-40 flex items-center gap-2 shadow-lg lg:bottom-6"
        onClick={() => setOpen(true)}
        aria-label="Open Savvy AI"
      >
        <Sparkles size={15} /> Savvy AI
      </button>
    );
  }

  return (
    <aside className="ss-card fixed bottom-4 right-4 z-50 flex h-[min(72vh,560px)] w-[min(94vw,380px)] flex-col overflow-hidden">
      <div className="ss-panel-head">
        <div className="flex items-center gap-2">
          <Sparkles size={15} />
          <div>
            <div className="text-[0.85rem] font-semibold">Savvy AI</div>
            <div className="text-[0.68rem] opacity-60">{workspace} workspace</div>
          </div>
        </div>
        <button aria-label="Close assistant" onClick={() => setOpen(false)}>
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {msgs.length === 0 ? (
          <div className="space-y-2">
            <p className="text-[0.8rem] opacity-70">
              Ask about any screen, draft a customer message, or get water-chemistry help.
            </p>
            {STARTERS.map((s) => (
              <button
                key={s}
                className="ss-btn ss-btn-ghost w-full text-left"
                onClick={() => void send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {msgs.map((m, i) => (
          <div
            key={i}
            className="max-w-[92%] whitespace-pre-wrap rounded-[10px] px-3 py-2 text-[0.82rem]"
            style={
              m.role === "user"
                ? { marginLeft: "auto", background: "hsl(var(--ss-burgundy) / .1)" }
                : { background: "hsl(var(--ss-ink) / .05)" }
            }
          >
            {m.text}
          </div>
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-[0.78rem] opacity-60">
            <Loader2 size={13} className="animate-spin" /> Thinking…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t p-2"
        style={{ borderColor: "hsl(var(--ss-line))" }}
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          className="ss-input flex-1"
          placeholder="Ask Savvy AI…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="ss-btn" disabled={busy || !input.trim()} aria-label="Send">
          <SendHorizontal size={14} />
        </button>
      </form>
    </aside>
  );
}
