import { onCallClick } from "@/components/CallButton";
import { useEffect, useRef, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { emailSignedContractCopy, signContractWithAudit } from "@/lib/contracts.functions";
import { classifyError, retryMessage, withRetry } from "@/lib/retry";
import { CheckCircle2, Eraser, PenLine, ShieldCheck } from "lucide-react";



type ContractView = {
  title: string;
  body: string;
  status: string;
  recipient_name: string | null;
  signer_name: string | null;
  signed_at: string | null;
  sent_at: string | null;
};

/** Audit facts captured at signature time, shown as a certificate of completion. */
type Certificate = {
  contractId: string | null;
  title: string | null;
  signerName: string;
  signedAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  startedAt: string | null;
  email: string | null;
  ip: string | null;
  userAgent: string;
};

export default function SignContract() {
  const { token = "" } = useParams();
  const [contract, setContract] = useState<ContractView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [inPerson, setInPerson] = useState(false);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const emailCopy = useServerFn(emailSignedContractCopy);
  const signNow = useServerFn(signContractWithAudit);


  useEffect(() => {
    setInPerson(new URLSearchParams(window.location.search).get("mode") === "inperson");
  }, []);


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const progressSent = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("ss_get_contract", { _token: token });
      if (cancelled) return;
      const row = (data as ContractView[] | null)?.[0];
      if (rpcError || !row) setNotFound(true);
      else {
        setContract(row);
        setSignerName(row.recipient_name ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contract || contract.status === "signed") return;
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
  }, [contract]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    if (!progressSent.current) {
      progressSent.current = true;
      void supabase.rpc("ss_mark_contract_progress", { _token: token });
    }
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

  const endDraw = () => {
    drawing.current = false;
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const submit = async () => {
    if (!canvasRef.current) return;
    setError(null);
    setRetryNote(null);
    if (signerName.trim().length < 2) {
      setError("Please type your full legal name.");
      return;
    }
    if (!hasInk) {
      setError("Please draw your signature in the box.");
      return;
    }
    if (!agreed) {
      setError("Please confirm you agree to the terms.");
      return;
    }
    setSubmitting(true);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    try {
      // Network blips on a phone in a backyard are the norm, not the
      // exception — transient failures retry automatically with backoff.
      const res = await withRetry(
        () =>
          signNow({
            data: {
              token,
              signerName: signerName.trim(),
              signatureDataUrl: dataUrl,
              userAgent: navigator.userAgent,
              consent: true,
            },
          }),
        {
          retries: 3,
          timeoutMs: 20_000,
          onRetry: ({ kind, attempt }) => setRetryNote(`${retryMessage(kind)} (attempt ${attempt + 1} of 4)`),
        },
      );
      setRetryNote(null);
      setJustSigned(true);
      setCertificate(res.certificate);
      setContract((c) =>
        c ? { ...c, status: "signed", signer_name: signerName.trim(), signed_at: res.certificate.signedAt } : c,
      );
    } catch (err) {
      const kind = classifyError(err);
      const raw = err instanceof Error ? err.message : "";
      setRetryNote(null);
      setError(
        kind === "network"
          ? "We couldn't reach the server — check your connection and tap Sign again. Your signature is still on the pad."
          : kind === "timeout"
            ? "The connection is slow right now. Tap Sign again — nothing was lost."
            : kind === "rate_limit" || kind === "server"
              ? "Our server is busy for a moment. Tap Sign again in a few seconds."
              : raw || "We couldn't save your signature. Call or text (817) 663-7665 and we'll help.",
      );
      return;
    } finally {
      setSubmitting(false);
    }

    try {
      const res = await withRetry(() => emailCopy({ data: { token } }), { retries: 2, timeoutMs: 20_000 });
      setCopyNote(
        res.sent && res.to
          ? `A signed copy was emailed to ${res.to}.`
          : res.reason === "failed"
            ? "Your agreement is signed and saved — the email copy didn't go through, so our office will resend it."
            : "A signed copy is on file with your account.",
      );
    } catch {
      setCopyNote("Your agreement is signed and saved. Our office will email your copy shortly.");
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-tech text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading agreement…</p>
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-3xl text-primary">Link not found</p>
          <p className="mt-3 text-sm text-muted-foreground">
            This signing link is invalid or no longer active. Call or text us at{" "}
            <a className="underline" href="tel:+18176637665" onClick={onCallClick("sign_contract")}>(817) 663-7665</a> and we’ll resend it.
          </p>
        </div>
      </div>
    );
  }

  const signed = contract.status === "signed";
  const expired = contract.status === "expired";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <div className="font-display text-xl tracking-tight">SAVVY SWIM</div>
          <div className="font-tech text-[0.65rem] tracking-[0.25em] uppercase opacity-80 mt-0.5">
            Service agreement · E-signature
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {inPerson && !signed && !expired && (
          <div className="mb-8 rounded-xl border border-border bg-card p-4">
            <p className="font-tech text-[0.65rem] tracking-[0.22em] uppercase text-muted-foreground">
              In-person signing
            </p>
            <p className="mt-1 text-sm text-foreground">
              Hand the device to the customer. After they sign, a copy is emailed automatically to the
              address on file.
            </p>
          </div>
        )}
        {signed && (
          <div className="mb-8 rounded-xl border border-border bg-card p-6 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">
                {justSigned ? "Thank you — your agreement is signed." : "This agreement has been signed."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed by {contract.signer_name}
                {contract.signed_at ? ` on ${new Date(contract.signed_at).toLocaleDateString()}` : ""}.
                {" "}
                {copyNote ?? "A copy is kept on file with your customer account."}
              </p>
            </div>
          </div>
        )}

        {certificate && (
          <section className="mb-8 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="font-tech text-[0.65rem] tracking-[0.25em] uppercase text-muted-foreground">
                Certificate of completion
              </h2>
            </div>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["Envelope ID", certificate.contractId ?? "—"],
                ["Document", certificate.title ?? contract.title],
                ["Signer", certificate.signerName],
                ["Email on file", certificate.email ?? "—"],
                ["Sent", certificate.sentAt ? new Date(certificate.sentAt).toLocaleString() : "—"],
                ["Viewed", certificate.viewedAt ? new Date(certificate.viewedAt).toLocaleString() : "—"],
                ["Signature started", certificate.startedAt ? new Date(certificate.startedAt).toLocaleString() : "—"],
                ["Signed", new Date(certificate.signedAt).toLocaleString()],
                ["Signer IP address", certificate.ip ?? "Not recorded"],
                ["Device", certificate.userAgent || "—"],
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <dt className="font-tech text-[0.6rem] tracking-[0.2em] uppercase text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="truncate text-foreground" title={String(value)}>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              This record confirms the identity signals captured at signing time and is stored with your
              agreement. Our office keeps a matching copy in the audit timeline.
            </p>
          </section>
        )}




        <h1 className="font-display text-2xl sm:text-3xl text-foreground">{contract.title}</h1>

        <article className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-8">
          <pre className="whitespace-pre-wrap font-body text-[0.9rem] leading-relaxed text-foreground">
            {contract.body}
          </pre>
        </article>

        {expired && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <p className="font-semibold text-foreground">This signing link has expired.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Call or text <a className="underline" href="tel:+18176637665" onClick={onCallClick("sign_contract")}>(817) 663-7665</a> and we’ll send you a fresh one.
            </p>
          </div>
        )}

        {!signed && !expired && (
          <section className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-tech text-xs tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-2">
              <PenLine className="h-3.5 w-3.5" /> Sign below
            </h2>

            <label className="mt-5 block text-sm font-medium text-foreground">
              Full legal name
              <input
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Type your full name"
                maxLength={120}
              />
            </label>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Draw your signature</span>
                <button
                  type="button"
                  onClick={clearPad}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eraser className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                className="mt-1.5 h-40 w-full touch-none rounded-md border border-dashed border-input bg-background"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
            </div>

            <label className="mt-5 flex items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and agree to the terms of this agreement, and I intend my electronic
                signature to be legally binding.
              </span>
            </label>

            {retryNote && <p className="mt-4 text-sm text-muted-foreground">{retryNote}</p>}
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}


            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-primary px-8 py-3.5 font-tech text-sm font-semibold tracking-wide text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Signing…" : "Sign agreement"}
            </button>
          </section>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Savvy Swim · (817) 663-7665 · Dallas–Fort Worth
        </p>
      </main>
    </div>
  );
}
