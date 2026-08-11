import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Phone, ArrowLeft, CheckCircle2, Loader2, CalendarPlus } from "lucide-react";
import { z } from "zod";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AddressMapPreview from "@/components/AddressMapPreview";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifyInspectionRequest } from "@/lib/inspection-notify.functions";
import { forwardLeadToCrm } from "@/lib/crm-lead-forward.functions";
import { getAttribution, getSessionId, trackContactClick } from "@/lib/contactTracking";
import { downloadIcs } from "@/lib/calendar";

const PHONE_DISPLAY = "(469) 744-0379";
const PHONE_HREF = "tel:+14697440379";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(40),
  address: z.string().trim().min(4, "Enter the property address").max(300),
  postal_code: z.string().trim().min(5, "Enter your ZIP code").max(20),
  preferred_date: z.string().optional(),
  pool_details: z.string().trim().max(500).optional(),
  preferred_contact_time: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const TIME_OPTIONS = [
  "Morning (8am–12pm)",
  "Afternoon (12pm–5pm)",
  "Evening (5pm–8pm)",
  "Anytime",
];

/** Bookable arrival windows, Monday–Saturday. */
const SLOTS = ["8:00 AM", "9:30 AM", "11:00 AM", "1:00 PM", "2:30 PM", "4:00 PM"];

type Day = { iso: string; weekday: string; day: string; month: string };

function buildDays(): Day[] {
  const out: Day[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // earliest booking is tomorrow
  while (out.length < 14) {
    if (cursor.getDay() !== 0) {
      out.push({
        iso: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
          cursor.getDate(),
        ).padStart(2, "0")}`,
        weekday: cursor.toLocaleDateString("en-US", { weekday: "short" }),
        day: String(cursor.getDate()),
        month: cursor.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** "1:00 PM" -> 13 */
function parseSlotHour(slot: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot.trim());
  if (!m) return 9;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3] ?? "")) h += 12;
  return h;
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-semibold text-destructive">
      {message}
    </p>
  );
}

/** (469) 744-0379 style formatting as the visitor types. */
function formatPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const RequestInspection = () => {
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [contactTime, setContactTime] = useState("");
  const [addressPlace, setAddressPlace] = useState<{ address: string; placeId: string }>({ address: "", placeId: "" });
  const days = useMemo(buildDays, []);
  const [slotDate, setSlotDate] = useState<string>(days[0]?.iso ?? "");
  const [slot, setSlot] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ date: string; slot: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const focusField = (field: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(field) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el?.focus({ preventScroll: true }), 250);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const fd = new FormData(e.currentTarget);
    const raw = {
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      postal_code: String(fd.get("postal_code") ?? ""),
      preferred_date: slotDate,
      pool_details: String(fd.get("pool_details") ?? ""),
      preferred_contact_time: slot || contactTime,
      notes: String(fd.get("notes") ?? ""),
    };

    setSubmitError(null);

    const parsed = schema.safeParse(raw);
    const fieldErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    if (!slot) fieldErrors["slot"] = "Pick an arrival window so we can lock your visit in";

    if (Object.keys(fieldErrors).length > 0 || !parsed.success) {
      setErrors(fieldErrors);
      const first = Object.keys(fieldErrors)[0];
      if (first && first !== "slot") focusField(first);
      else if (first === "slot") focusField("arrival-window");
      return;
    }
    setErrors({});

    setSubmitting(true);
    const a = getAttribution();
    const { data, error } = await supabase
      .from("inspection_requests")
      .insert({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        postal_code: parsed.data.postal_code,
        preferred_date: parsed.data.preferred_date || null,
        pool_details: parsed.data.pool_details || null,
        preferred_contact_time: parsed.data.preferred_contact_time || null,
        preferred_slot: slot || null,
        notes: parsed.data.notes || null,

        campaign_id: a.campaignId,
        utm_source: a.utmSource,
        utm_medium: a.utmMedium,
        utm_campaign: a.utmCampaign,
        utm_term: a.utmTerm,
        utm_content: a.utmContent,
        page_path: window.location.pathname,
        landing_page: a.landingPage,
        referrer: a.referrer,
        session_id: getSessionId(),
      })
      .select("id, reference_number")
      .single();

    setSubmitting(false);

    if (error || !data) {
      console.error("inspection request failed", error?.message);
      // Keep everything the visitor typed and offer a call fallback instead of
      // a toast that disappears on a phone.
      setSubmitError(
        "We couldn't send that request just now. Check your connection and try again — or call us and we'll book it for you.",
      );
      toast.error("Request didn't go through — please try again");
      return;
    }

    setReference(data.reference_number);
    setConfirmed({ date: slotDate, slot });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });

    void notifyInspectionRequest({ data: { requestId: data.id } }).catch((err) =>
      console.warn("inspection notification not sent", err),
    );
    // Hand the lead straight to the CRM app so sales works one inbox.
    void forwardLeadToCrm({ data: { requestId: data.id } }).catch((err) =>
      console.warn("crm lead forward failed", err),
    );
    void supabase.functions
      .invoke("send-inspection-sms", { body: { requestId: data.id } })
      .then(({ error: smsError }) => {
        if (smsError) console.warn("confirmation sms not sent", smsError.message);
      });
  };


  return (
    <div className="min-h-screen overflow-x-hidden">
      <Seo
        title="Request a Free Pool Service Visit | Savvy Swim"
        description="Book a free pool service visit and water assessment. Cleaning, repairs and water care by certified techs across DFW — no cost, no obligation."
        path="/request-inspection"
      />

      <header className="border-b border-hairline bg-background">
        <div className="container-tight flex h-[64px] items-center justify-between gap-3 sm:h-[76px]">
          <Link to="/" className="flex items-center gap-3" aria-label="Savvy Swim — home">
            <span className="whitespace-nowrap font-display text-[1.15rem] uppercase leading-none tracking-tight text-accent sm:text-[1.6rem]">
              Savvy Swim
            </span>
          </Link>
          <a
            href={PHONE_HREF}
            onClick={() => trackContactClick("call_click", "inspection_header")}
            className="inline-flex items-center gap-2 text-sm font-semibold transition hover:text-primary"
          >
            <Phone className="h-4 w-4 text-amber-brand" /> {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <main className="container-tight py-14 sm:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-tech text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back home
        </Link>

        {reference ? (
          <div className="mt-8 max-w-xl rounded-sm border border-hairline p-8 sm:p-10">
            <CheckCircle2 className="h-8 w-8 text-amber-brand" strokeWidth={1.75} />
            <h1 className="mt-5 font-display text-[2rem] uppercase leading-none tracking-tight sm:text-[2.6rem]">
              Request received
            </h1>
            {confirmed && (
              <p className="mt-4 border-l-2 border-accent pl-4 font-tech text-[12px] uppercase tracking-[0.18em]">
                {new Date(`${confirmed.date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {confirmed.slot}
              </p>
            )}
            <p className="mt-4 text-muted-foreground">
              Your reference number is{" "}
              <span className="font-tech text-foreground">{reference}</span>. We just texted you a
              confirmation with next steps — your tech confirms this window within one business day.
            </p>

            <a
              href={PHONE_HREF}
              onClick={() => trackContactClick("call_click", "inspection_confirmation")}
              className="btn-quote mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-md px-6 text-[13px] font-bold uppercase tracking-wide transition sm:w-auto"
            >
              <Phone className="h-4 w-4" /> Call us now
            </a>
            {confirmed && (
              <button
                type="button"
                onClick={() => {
                  const startHour = parseSlotHour(confirmed.slot);
                  downloadIcs({
                    title: "Savvy Swim — free pool visit",
                    description: `Reference ${reference}. Your tech confirms this window within one business day.`,
                    date: confirmed.date,
                    startHour,
                    endHour: startHour + 2,
                  });
                }}
                className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 border border-hairline px-6 text-[13px] font-bold uppercase tracking-wide transition hover:border-accent sm:ml-3 sm:mt-8 sm:w-auto"
              >
                <CalendarPlus className="h-4 w-4" /> Add to calendar
              </button>
            )}
          </div>

        ) : (
          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="border-t-2 border-accent pt-6">
                <div className="mb-4 font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  No cost, no obligation
                </div>
                <h1 className="font-display text-[2.4rem] uppercase leading-[0.94] tracking-tight sm:text-[3.4rem]">
                  Request free <span className="text-accent">pool visit.</span>
                </h1>
                <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
                  Tell us where your pool is and when you'd like us out. We check the water, the
                  equipment pad, and the surfaces — then send a written report with exactly what
                  your pool needs and what it costs.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-5 lg:col-span-7">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    maxLength={120}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    aria-invalid={!!errors["full_name"]}
                    aria-describedby={errors["full_name"] ? "full_name-error" : undefined}
                  />
                  <FieldError id="full_name-error" message={errors["full_name"]} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={40}
                    autoComplete="tel"
                    enterKeyHint="next"
                    placeholder="(469) 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    aria-invalid={!!errors["phone"]}
                    aria-describedby={errors["phone"] ? "phone-error" : undefined}
                  />
                  <FieldError id="phone-error" message={errors["phone"]} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  maxLength={255}
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder="you@email.com"
                  aria-invalid={!!errors["email"]}
                  aria-describedby={errors["email"] ? "email-error" : undefined}
                />
                <FieldError id="email-error" message={errors["email"]} />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Property address *</Label>
                  <AddressAutocomplete
                    id="address"
                    name="address"
                    maxLength={300}
                    placeholder="Start typing your address…"
                    onSelect={(v, pid) => setAddressPlace({ address: v, placeId: pid })}
                  />
                  <FieldError id="address-error" message={errors["address"]} />
                  <AddressMapPreview placeId={addressPlace.placeId} address={addressPlace.address} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">ZIP *</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    inputMode="numeric"
                    maxLength={5}
                    autoComplete="postal-code"
                    enterKeyHint="done"
                    placeholder="75024"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    aria-invalid={!!errors["postal_code"]}
                    aria-describedby={errors["postal_code"] ? "postal_code-error" : undefined}
                  />
                  <FieldError id="postal_code-error" message={errors["postal_code"]} />
                </div>
              </div>


              <div className="space-y-3 border-t border-hairline pt-6">
                <Label className="font-tech text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Pick your day
                </Label>
                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d) => {
                    const active = d.iso === slotDate;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSlotDate(d.iso)}
                        aria-pressed={active}
                        className={`min-w-[68px] shrink-0 snap-start border px-3 py-2.5 text-center transition ${
                          active
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-hairline hover:border-accent"
                        }`}
                      >
                        <span className="block font-tech text-[10px] uppercase tracking-[0.18em] opacity-80">
                          {d.weekday}
                        </span>
                        <span className="block font-display text-[1.4rem] leading-none">{d.day}</span>
                        <span className="block font-tech text-[10px] uppercase tracking-[0.18em] opacity-80">
                          {d.month}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <Label
                  id="arrival-window"
                  tabIndex={-1}
                  className="font-tech text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Arrival window
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

                  {SLOTS.map((s) => {
                    const active = s === slot;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlot(s)}
                        aria-pressed={active}
                        className={`border px-3 py-3 text-sm font-semibold transition ${
                          active
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-hairline hover:border-accent"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <FieldError id="slot-error" message={errors["slot"]} />
                <p className="text-xs text-muted-foreground">
                  Windows are ~2 hours. We confirm by text right after you submit.
                </p>

              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_contact_time">Best time to reach you</Label>
                <Select value={contactTime} onValueChange={setContactTime}>
                  <SelectTrigger id="preferred_contact_time">
                    <SelectValue placeholder="Pick a window" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="pool_details">Pool details (size, type, equipment)</Label>
                <Input
                  id="pool_details"
                  name="pool_details"
                  maxLength={500}
                  placeholder="15,000 gal gunite, salt system, Pentair pump"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anything else we should know?</Label>
                <Textarea id="notes" name="notes" rows={4} maxLength={1000} />
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="border-l-2 border-destructive bg-destructive/5 p-4 text-sm text-foreground"
                >
                  <p>{submitError}</p>
                  <a
                    href={PHONE_HREF}
                    onClick={() => trackContactClick("call_click", "inspection_error")}
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 border border-hairline px-4 text-[12px] font-bold uppercase tracking-wide"
                  >
                    <Phone className="h-4 w-4" /> Call {PHONE_DISPLAY}
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="btn-quote inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-md px-7 text-[13px] font-bold uppercase tracking-wide transition disabled:opacity-60 sm:w-auto"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Sending" : "Request free pool visit"}
              </button>


              <p className="text-xs text-muted-foreground">
                By submitting you agree to receive a confirmation text about this request. Message
                and data rates may apply.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default RequestInspection;
