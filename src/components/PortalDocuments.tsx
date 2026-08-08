import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Eraser, FileSignature, PenLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Doc = {
  id: string;
  title: string;
  doc_kind: string;
  status: string;
  token: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
};

const KIND_LABEL: Record<string, string> = {
  agreement: "Agreement",
  service: "Service agreement",
  waiver: "Waiver",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Awaiting signature",
  viewed: "Awaiting signature",
  signed: "Signed",
  declined: "Declined",
};

export default function PortalDocuments({ customerName }: { customerName?: string | null }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [body, setBody] = useState<string>("");
  const [signerName, setSignerName] = useState(customerName ?? "");
  const [agreed, setAgreed] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("ss_my_documents" as never);
    setDocs(((data as unknown as Doc[]) ?? []).filter(Boolean));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (customerName && !signerName) setSignerName(customerName);
  }, [customerName, signerName]);

  const openDoc = async (doc: Doc) => {
    if (openId === doc.id) {
      setOpenId(null);
      return;
    }
    setOpenId(doc.id);
    setAgreed(false);
    setHasInk(false);
    setBody("");
    const { data } = await supabase.rpc("ss_get_contract", { _token: doc.token });
    const row = (data as { body: string }[] | null)?.[0];
    setBody(row?.body ?? "This document is no longer available.");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#2b2320";
    }
  }, [openId, body]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  async function sign(doc: Doc) {
    if (signerName.trim().length < 2) {
      toast.error("Type your full legal name.");
      return;
    }
    if (!hasInk || !canvasRef.current) {
      toast.error("Draw your signature in the box.");
      return;
    }
    if (!agreed) {
      toast.error("Confirm you approve this packet for submission.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("ss_sign_contract", {
      _token: doc.token,
      _signer_name: signerName.trim(),
      _signature_data_url: canvasRef.current.toDataURL("image/png"),
      _user_agent: navigator.userAgent,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed — we'll submit this packet for you.");
    setOpenId(null);
    clearPad();
    setAgreed(false);
    await load();
  }

  const pending = docs.filter((d) => d.status !== "signed" && d.status !== "declined").length;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-tight">
            <FileSignature className="h-4 w-4 text-accent" aria-hidden="true" /> Documents to sign
            {pending > 0 && (
              <span className="bg-accent px-2 py-0.5 font-tech text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                {pending} pending
              </span>
            )}
          </h2>
          <p className="mt-1 font-tech text-xs text-primary/60">
            Service agreements and authorizations — review and approve digitally, no printing or scanning.
          </p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-primary/10 border border-hairline">
        {docs.length === 0 && (
          <p className="p-5 font-tech text-sm text-primary/60">Nothing waiting for your signature.</p>
        )}
        {docs.map((d) => {
          const isOpen = openId === d.id;
          const signed = d.status === "signed";
          return (
            <article key={d.id}>
              <button
                type="button"
                onClick={() => void openDoc(d)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              >
                <div className="min-w-0">
                  <p className="font-tech text-sm font-semibold">{d.title}</p>
                  <p className="mt-0.5 font-tech text-[11px] text-primary/55">
                    {KIND_LABEL[d.doc_kind] ?? d.doc_kind} ·{" "}
                    {signed && d.signed_at
                      ? `Signed ${new Date(d.signed_at).toLocaleDateString()} by ${d.signer_name ?? "you"}`
                      : d.sent_at
                        ? `Sent ${new Date(d.sent_at).toLocaleDateString()}`
                        : "Ready to review"}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1.5 font-tech text-[11px] uppercase tracking-[0.14em] ${
                    signed ? "text-primary/50" : "text-accent"
                  }`}
                >
                  {signed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-primary/10 p-5">
                  <div className="max-h-72 overflow-y-auto border border-primary/15 p-4">
                    <p className="whitespace-pre-wrap font-tech text-sm leading-relaxed">
                      {body || "Loading document…"}
                    </p>
                  </div>

                  {signed ? (
                    <p className="mt-4 flex items-center gap-2 font-tech text-xs text-primary/60">
                      <ShieldCheck className="h-4 w-4 text-accent" /> Approved and on file — a copy was emailed to you.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="font-tech text-xs uppercase tracking-[0.14em] text-primary/60">
                          Full legal name
                        </span>
                        <input
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          maxLength={120}
                          className="mt-1 w-full border border-primary/20 bg-transparent p-2.5 font-tech text-sm outline-none focus:border-primary"
                        />
                        <label className="mt-3 flex items-start gap-2 font-tech text-xs text-primary/70">
                          <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            I approve this document, confirm the information is accurate, and authorize Savvy Swim to
                            proceed with the service described. My typed name and drawn signature are my electronic
                            signature.
                          </span>
                        </label>
                      </label>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-tech text-xs uppercase tracking-[0.14em] text-primary/60">
                            Signature
                          </span>
                          <button
                            type="button"
                            onClick={clearPad}
                            className="inline-flex items-center gap-1 font-tech text-[11px] uppercase tracking-[0.14em] text-primary/60"
                          >
                            <Eraser className="h-3 w-3" /> Clear
                          </button>
                        </div>
                        <canvas
                          ref={canvasRef}
                          onPointerDown={startDraw}
                          onPointerMove={moveDraw}
                          onPointerUp={() => (drawing.current = false)}
                          onPointerLeave={() => (drawing.current = false)}
                          className="mt-1 h-32 w-full touch-none border border-primary/20 bg-white"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void sign(d)}
                          className="btn-quote mt-3 inline-flex items-center gap-2 px-5 py-3 text-[12px] font-bold uppercase tracking-wide disabled:opacity-50"
                        >
                          <PenLine className="h-3.5 w-3.5" /> Sign & approve
                        </button>
                      </div>
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
