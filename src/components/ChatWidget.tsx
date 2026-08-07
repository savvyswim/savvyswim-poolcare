import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, Phone, RotateCcw, X } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "savvy_chat_v1";

const SUGGESTIONS = [
  "What's included in weekly service?",
  "How does the Swim Club work?",
  "My pool turned green — help",
];

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UIMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [initialMessages] = useState<UIMessage[]>(() => loadMessages());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: "savvy-website-chat",
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* storage unavailable — chat still works for this session */
    }
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open && !busy) textareaRef.current?.focus();
  }, [open, busy, messages.length]);

  const send = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setInput("");
      void sendMessage({ text: value });
    },
    [busy, sendMessage],
  );

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Chat with Savvy"}
        className={cn(
          "fixed bottom-5 right-5 z-[60] flex h-14 items-center gap-2 border border-foreground/15 bg-primary px-4 text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-95",
          "md:bottom-7 md:right-7",
        )}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          {open ? "Close" : "Ask Savvy"}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-x-3 bottom-24 z-[60] flex max-h-[70vh] flex-col overflow-hidden border border-foreground/15 bg-background shadow-2xl md:inset-x-auto md:right-7 md:bottom-28 md:h-[560px] md:w-[400px]"
          role="dialog"
          aria-label="Savvy Swim assistant"
        >
          <header className="flex items-center justify-between gap-3 border-b border-foreground/10 bg-foreground px-4 py-3 text-background">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] opacity-70">
                Savvy Swim
              </p>
              <p className="text-sm font-semibold">Pool concierge — ask anything</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                try {
                  window.localStorage.removeItem(STORAGE_KEY);
                } catch {
                  /* ignore */
                }
              }}
              aria-label="Start a new conversation"
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <RotateCcw className="size-4" />
            </button>
          </header>

          <Conversation className="flex-1">
            <ConversationContent className="gap-5 p-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Hi — I'm Savvy. I can explain weekly service, water chemistry, repairs and the
                    Swim Club, or get you set up with a free quote.
                  </p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="border border-foreground/15 px-3 py-2 text-left text-[0.82rem] transition-colors hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent
                    className={cn(
                      message.role === "assistant" &&
                        "bg-transparent p-0 text-foreground [&>*]:text-foreground",
                    )}
                  >
                    <MessageResponse>
                      {message.parts
                        .map((part) => (part.type === "text" ? part.text : ""))
                        .join("")}
                    </MessageResponse>
                  </MessageContent>
                </Message>
              ))}

              {status === "submitted" && (
                <Shimmer className="text-sm">Savvy is thinking…</Shimmer>
              )}

              {error && (
                <p className="text-sm text-destructive">
                  Something went wrong. Try again, or text us at{" "}
                  <a className="underline" href="sms:+14697440379">
                    (469) 744-0379
                  </a>
                  .
                </p>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t border-foreground/10 p-3">
            <PromptInput
              onSubmit={(_, event) => {
                event.preventDefault();
                send(input);
              }}
            >
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about service, pricing or repairs…"
              />
              <PromptInputFooter className="justify-between">
                <a
                  href="tel:+14697440379"
                  className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                >
                  <Phone className="size-3.5" /> Call us
                </a>
                <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
