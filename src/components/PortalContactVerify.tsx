import { useState } from "react";
import { Loader2, MailCheck, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { confirmContactChange, requestContactChange } from "@/lib/contact-verification.functions";

const inputClass =
  "w-full border border-primary/20 bg-background px-3 py-2 font-tech text-sm text-foreground outline-none focus:border-accent";
const labelClass = "mb-1 block font-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

type Props = {
  channel: "email" | "sms";
  current: string | null;
  onVerified: () => void;
};

/**
 * Email / phone can only change after a one-time code is delivered to the NEW
 * address or number, so a typo can never silently cut a customer off.
 */
export default function PortalContactVerify({ channel, current, onVerified }: Props) {
  const isEmail = channel === "email";
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "editing" | "code">("idle");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);

  const requestChange = useServerFn(requestContactChange);
  const confirmChange = useServerFn(confirmContactChange);

  const sendCode = async () => {
    setBusy(true);
    try {
      const res = await requestChange({ data: { channel, value } });
      setSentTo(res.sentTo);
      setStage("code");
      toast.success(isEmail ? `Code emailed to ${res.sentTo}` : `Code texted to ${res.sentTo}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmChange({ data: { channel, code } });
      toast.success(isEmail ? "Email verified and updated" : "Phone number verified and updated");
      setStage("idle");
      setValue("");
      setCode("");
      onVerified();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm that code");
    } finally {
      setBusy(false);
    }
  };

  const label = isEmail ? "Email" : "Phone";
  const Icon = isEmail ? MailCheck : Smartphone;

  return (
    <div className="border border-primary/15 p-3">
      <p className={labelClass}>{label} on file</p>
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        <span className="font-tech text-sm text-foreground">{current || "Not set"}</span>
        {stage === "idle" && (
          <button
            type="button"
            onClick={() => {
              setValue(current ?? "");
              setStage("editing");
            }}
            className="ml-auto border border-primary/25 px-2 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-primary hover:border-accent"
          >
            Change
          </button>
        )}
      </div>

      {stage === "editing" && (
        <div className="mt-3 space-y-2">
          <label className={labelClass} htmlFor={`cv-${channel}`}>
            New {label.toLowerCase()}
          </label>
          <input
            id={`cv-${channel}`}
            className={inputClass}
            type={isEmail ? "email" : "tel"}
            maxLength={isEmail ? 200 : 40}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isEmail ? "you@example.com" : "(469) 555-0142"}
          />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 text-accent" aria-hidden="true" />
            We send a 6-digit code to the new {isEmail ? "inbox" : "number"} before anything changes.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || value.trim().length < 3}
              className="inline-flex items-center gap-2 bg-primary px-3 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              Send code
            </button>
            <button
              type="button"
              onClick={() => setStage("idle")}
              className="border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "code" && (
        <div className="mt-3 space-y-2">
          <label className={labelClass} htmlFor={`cv-code-${channel}`}>
            Code sent to {sentTo}
          </label>
          <input
            id={`cv-code-${channel}`}
            className={`${inputClass} tracking-[0.4em]`}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={busy || code.length !== 6}
              className="inline-flex items-center gap-2 bg-primary px-3 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              Confirm {label.toLowerCase()}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy}
              className="border border-primary/25 px-3 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-primary disabled:opacity-60"
            >
              Resend
            </button>
            <button
              type="button"
              onClick={() => setStage("idle")}
              className="px-2 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
