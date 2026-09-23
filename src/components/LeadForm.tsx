import { onCallClick } from "@/components/CallButton";
/**
 * Shared lead form used by both modals (booking / free water test).
 *
 * Posts to our own hardened endpoint (POST /api/public/leads), Zod validation,
 * honeypot, minimum fill time, Turnstile and rate limiting all live there.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AddressMapPreview from "@/components/AddressMapPreview";
import { trackSiteEvent } from "@/lib/site-analytics";
import { extractZip } from "@/lib/postal";
import { checkPromoCode } from "@/lib/promo.functions";
import type { PromoCheck } from "@/lib/promo.functions";

export const SWIM_CLUB_OPTION = "Savvy Swim Club membership, $19.99/mo";

export const SERVICES = [
  "Weekly Service & Maintenance",
  "Equipment Repair",
  "Green Pool Recovery",
  "Salt & Automation Service",
  "Filter Clean",
  "Surface & Tile Care",
  "On-site Inspection",
  SWIM_CLUB_OPTION,
  "Not sure, help me decide",
] as const;

export const WATER_TESTS = [
  "Full chemistry panel",
  "Green pool diagnosis",
  "Salt cell / chlorinator check",
  "Scale & hardness (NTMWD water)",
  "Not sure, help me decide",
] as const;

export const TIMES = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
] as const;

const FIELD =
  "w-full min-h-[48px] border border-[#8E1F2C]/25 bg-white px-4 py-3 text-[15px] text-[#2a1013] placeholder:text-[#2a1013]/45 outline-none focus-visible:border-[#8E1F2C] focus-visible:ring-2 focus-visible:ring-[#8E1F2C]/30";

const PHONE = "817-663-7665";
const PHONE_HREF = "tel:+18176637665";

/** Single combined authorization shown on the form, stored verbatim as the consent record. */
export const CONSENT_TEXT =
  "I authorize Savvy Swim to contact me by phone call, text message and email about this request, including automated or prerecorded messages and appointment updates at the number I provided. Message and data rates may apply; message frequency varies. Reply STOP to opt out or HELP for help. I have read and agree to the Privacy Policy and Terms.";

/** Separate, optional marketing permission. Never pre-checked. */
export const MARKETING_CONSENT_TEXT =
  "I also agree to receive marketing from Savvy Swim by text message and email, including promotions, seasonal pool reminders, service offers and company news, sent with automated technology at the number and email I provided. Consent is not a condition of any purchase. Message and data rates may apply; message frequency varies. Reply STOP to opt out of texts, or use the unsubscribe link in any email. See the Privacy Policy and Terms.";

export type LeadFormProps = {
  /** CRM connector intent tag. */
  cta: string;
  /** Label for the service / test dropdown. */
  optionsLabel: string;
  options: readonly string[];
  defaultOption?: string | undefined;
  source: string;
  submitLabel: string;
  openedAt: number;
  /** Known contact details, used when a follow up link opens the form. */
  prefill?:
    | {
        name?: string | undefined;
        phone?: string | undefined;
        email?: string | undefined;
        address?: string | undefined;
      }
    | undefined;
  onCancel: () => void;

  onDone: (summary: {
    date?: Date | undefined;
    time?: string | undefined;
    reference?: string | undefined;
    email?: string | undefined;
  }) => void;
};

type Errors = Partial<Record<string, string>>;

export default function LeadForm({
  cta,
  optionsLabel,
  options,
  defaultOption,
  source,
  submitLabel,
  openedAt,
  onCancel,
  onDone,
}: LeadFormProps) {
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [choice, setChoice] = useState(defaultOption ?? "");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCheck, setPromoCheck] = useState<PromoCheck | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot

  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Debounced discount / referral code check. Never blocks the submit. An
  // unrecognised code still goes through, flagged for the office.
  useEffect(() => {
    const code = promoCode.trim();
    if (code.length < 3) {
      setPromoCheck(null);
      setPromoChecking(false);
      return;
    }
    let cancelled = false;
    setPromoChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await checkPromoCode({ data: { code } });
        if (!cancelled) setPromoCheck(res);
      } catch {
        if (!cancelled) setPromoCheck(null);
      } finally {
        if (!cancelled) setPromoChecking(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [promoCode]);


  function validate(): boolean {
    const next: Errors = {};
    if (name.trim().length < 2) next['name'] = "Please enter your full name";
    if (!/^[0-9+()\-.\s]{7,}$/.test(phone.trim())) next['phone'] = "Enter a valid phone number";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next['email'] = "Enter a valid email";
    if (address.trim().length < 4) next['address'] = "Enter your property address";
    if (!choice) next['choice'] = `Pick ${optionsLabel.toLowerCase()}`;
    if (!date) next['date'] = "Pick a preferred date";
    if (!time) next['time'] = "Pick a preferred time";
    if (!contactConsent)
      next['contactConsent'] = "Please agree to be contacted so we can reply";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (!validate()) return;

    // First-touch campaign data (utm_*, ?src= code, gclid/fbclid), captured on
    // the session's landing page so it survives page-to-page navigation.
    const { getLeadAttribution } = await import("@/lib/lead-attribution");
    const attr = getLeadAttribution();
    // Session id, kept for the whole browsing session.
    let sessionId: string | null = null;
    try {
      sessionId = sessionStorage.getItem("ss_sid");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("ss_sid", sessionId);
      }
    } catch {
      /* private mode, attribution is best effort */
    }

    const body = {
      full_name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      postal_code: extractZip(address),
      pool_details: choice,
      preferred_date: date ? format(date, "yyyy-MM-dd") : null,
      preferred_contact_time: time,
      message:
        [notes.trim(), promoCode.trim() ? `Discount code: ${promoCode.trim().toUpperCase()}` : ""]
          .filter(Boolean)
          .join("\n\n") || null,
      promo_code: promoCode.trim().toUpperCase() || null,
      sms_opt_in: contactConsent,
      contact_consent: contactConsent,
      consent_text: CONSENT_TEXT,
      source: attr.campaign_code ? `${source}_${attr.campaign_code}` : source,
      page: window.location.pathname.slice(0, 200),
      campaign_id: attr.campaign_id,
      campaign_code: attr.campaign_code,
      utm_source: attr.utm_source || "savvyswim.com",
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      utm_term: attr.utm_term,
      utm_content: attr.utm_content,
      gclid: attr.gclid,
      fbclid: attr.fbclid,
      referrer: attr.referrer ?? (document.referrer ? document.referrer.slice(0, 255) : null),
      landing_page: attr.landing_page,
      session_id: sessionId,
      elapsed_ms: Math.max(0, Date.now() - openedAt),
      company,
    };



    setSending(true);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        reference?: string;
      };
      if (res.ok && data.ok) {
        trackSiteEvent("lead_click", `${source}_submitted`);
        void import("@/lib/meta-pixel").then((m) =>
          m.metaTrackLead({ content_name: source }),
        );
        onDone({ date, time, reference: data.reference, email: email.trim() });
        return;
      }
      setError(data.error || `We couldn't send that just now. Try again, or call ${PHONE}.`);
    } catch {
      setError(`Network hiccup. Try again, or call ${PHONE}.`);
    } finally {
      setSending(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-[12px] font-medium text-[#8E1F2C]">{errors[k]}</p>
    ) : null;

  return (
    <form onSubmit={onSubmit} data-savvy-cta={cta} className="mt-6 space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">Full name</span>
          <input
            ref={firstFieldRef}
            name="full_name"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={FIELD}
          />
          {err("name")}
        </label>
        <label className="block">
          <span className="sr-only">Phone number</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={FIELD}
          />
          {err("phone")}
        </label>
      </div>

      <label className="block">
        <span className="sr-only">Email address</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={FIELD}
        />
        {err("email")}
      </label>

      <div>
        <span className="sr-only">Pool address</span>
        <AddressAutocomplete
          name="address"
          value={address}
          placeholder="Pool address"
          className={FIELD}
          onChange={(v) => {
            setAddress(v);
            setPlaceId(undefined);
          }}
          onSelect={(v, id) => {
            setAddress(v);
            setPlaceId(id);
          }}
        />
        {err("address")}
        {placeId ? (
          <AddressMapPreview placeId={placeId} address={address} className="h-40" />
        ) : null}
      </div>

      <label className="block">
        <span className="sr-only">{optionsLabel}</span>
        <select
          name="choice"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className={cn(FIELD, "appearance-none")}
        >
          <option value="">{optionsLabel}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {err("choice")}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(FIELD, "flex items-center gap-2 text-left", !date && "text-[#2a1013]/45")}
              >
                <CalendarIcon className="h-4 w-4 text-[#8E1F2C]" />
                {date ? format(date, "EEE, MMM d") : "Preferred date"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="z-[200] w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setCalOpen(false);
                }}
                disabled={(d) => d < today}
                autoFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {err("date")}
        </div>
        <div>
          <label className="block">
            <span className="sr-only">Preferred time</span>
            <select
              name="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cn(FIELD, "appearance-none")}
            >
              <option value="">Preferred time</option>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {err("time")}
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Anything we should know?</span>
        <textarea
          name="message"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything we should know? (green pool, equipment, gate code…)"
          className={FIELD}
        />
      </label>

      <label className="block">
        <span className="sr-only">Discount or referral code (optional)</span>
        <input
          name="promo_code"
          autoComplete="off"
          autoCapitalize="characters"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Discount or referral code (optional)"
          aria-describedby="promo-code-status"
          className={FIELD}
        />
        <span id="promo-code-status" aria-live="polite" className="mt-1 block text-[11px]">
          {promoChecking ? (
            <span className="text-[#2a1013]/55">Checking code…</span>
          ) : promoCheck && promoCheck.status === "valid" ? (
            <span className="font-semibold text-[#1FA9BE]">
              {promoCheck.kind === "referral" ? "Referral code applied" : "Code applied"}
              {promoCheck.detail ? `: ${promoCheck.detail}` : ""}
            </span>
          ) : promoCheck && promoCheck.status !== "empty" ? (
            <span className="text-[#8E1F2C]">
              {promoCheck.message} You can still send your request.
            </span>
          ) : (
            <span className="text-[#2a1013]/55">
              Have a discount or referral code? Enter it here and we&apos;ll apply it to your quote.
            </span>
          )}
        </span>
      </label>


      <label className="flex cursor-pointer items-start gap-3 border border-[#8E1F2C]/20 bg-white/60 p-3">
        <input
          type="checkbox"
          checked={contactConsent}
          onChange={(e) => setContactConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#8E1F2C]"
        />
        <span className="text-[11px] leading-relaxed text-[#2a1013]/70">
          I authorize <strong className="text-[#2a1013]">Savvy Swim</strong> to contact me by phone
          call, text message and email about this request, including automated or prerecorded
          messages and appointment updates at the number I provided. Message and data rates may
          apply; message frequency varies. Reply <strong>STOP</strong> to opt out or{" "}
          <strong>HELP</strong> for help. I have read and agree to the Privacy Policy and Terms.
        </span>
      </label>
      {err("contactConsent")}


      <p className="text-[11px] leading-relaxed text-[#2a1013]/55">
        We never sell or share your information with third parties for marketing. See our{" "}
        <a href="/privacy" className="underline hover:text-[#8E1F2C]">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/terms" className="underline hover:text-[#8E1F2C]">
          Terms
        </a>
        .
      </p>


      {/* Honeypot, real people never fill this in. */}
      <input
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="hidden"
      />

      <div aria-live="polite" className="min-h-[1.25rem]">
        {error ? <p className="text-sm font-medium text-[#8E1F2C]">{error}</p> : null}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="min-h-[52px] w-full bg-[#8E1F2C] px-6 font-semibold uppercase tracking-[0.12em] text-[#F4EFE3] transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA9BE]"
      >
        {sending ? "Sending…" : submitLabel}
      </button>

      <div className="flex items-center justify-between gap-4 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] text-sm uppercase tracking-[0.12em] text-[#2a1013]/60 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1F2C]"
        >
          Never mind
        </button>
        <a
          href={PHONE_HREF}
          onClick={onCallClick("lead_form_call_instead")}
          className="min-h-[44px] text-sm uppercase tracking-[0.12em] text-[#8E1F2C] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1F2C]"
        >
          Call instead
        </a>
      </div>
    </form>
  );
}
