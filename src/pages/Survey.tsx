/**
 * Savvy Swim pool care survey landing page.
 *
 * Every question and the contact fields live on one page with a single submit
 * button. The finished survey is sent to the same hardened lead endpoint the
 * quote form uses, and the visitor is redirected to the thank you page.
 */
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { extractZip } from "@/lib/postal";
import { trackSiteEvent } from "@/lib/site-analytics";
import { CONSENT_TEXT, MARKETING_CONSENT_TEXT } from "@/components/LeadForm";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AddressMapPreview from "@/components/AddressMapPreview";
import {
  formatAnswers,
  visibleQuestions,
  type SurveyAnswers,
} from "@/lib/survey-questions";

const PHONE = "817-663-7665";

const FIELD =
  "w-full min-h-[48px] border border-[#8E1F2C]/25 bg-white px-4 py-3 text-[15px] text-[#2a1013] placeholder:text-[#2a1013]/45 outline-none focus-visible:border-[#8E1F2C] focus-visible:ring-2 focus-visible:ring-[#8E1F2C]/30";

const LEGAL_LINK = "font-semibold text-[#8E1F2C] underline underline-offset-2";

export default function Survey() {
  const navigate = useNavigate();
  const openedAt = useRef(Date.now());
  const formRef = useRef<HTMLFormElement | null>(null);

  const [answers, setAnswers] = useState<SurveyAnswers>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [consent, setConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [company, setCompany] = useState(""); // honeypot

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useMemo(() => visibleQuestions(answers), [answers]);

  const answered = questions.filter((q) => {
    const value = answers[q.id];
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  const progress = Math.round((answered / Math.max(1, questions.length)) * 100);

  const setAnswer = (id: string, value: string | string[]) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const togglePick = (id: string, option: string, maxPicks: number) => {
    const picked = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
    if (picked.includes(option)) {
      setAnswer(id, picked.filter((p) => p !== option));
      return;
    }
    if (picked.length >= maxPicks) return;
    setAnswer(id, [...picked, option]);
  };

  function focusFirstError(next: Record<string, string>) {
    const first = Object.keys(next)[0];
    if (!first || !formRef.current) return;
    const node = formRef.current.querySelector<HTMLElement>(`[data-field="${first}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    node?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const question of questions) {
      if (question.optional) continue;
      const value = answers[question.id];
      const filled = Array.isArray(value)
        ? value.length > 0
        : typeof value === "string" && value.trim().length > 0;
      if (!filled) next[question.id] = "Please pick an answer";
    }
    if (name.trim().length < 2) next['name'] = "Please enter your full name";
    if (!/^[0-9+()\-.\s]{7,}$/.test(phone.trim())) next['phone'] = "Enter a valid phone number";
    // Email and address are optional. Only check the format when one is typed.
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      next['email'] = "Enter a valid email, or leave it blank";
    if (!consent) next['consent'] = "Please agree to be contacted so we can reply";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusFirstError(next);
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (!validate()) return;

    const { getLeadAttribution } = await import("@/lib/lead-attribution");
    const attr = getLeadAttribution();
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

    // The lead record requires an email and an address, so a blank one is
    // stored as a clear marker and called out in the notes for the office.
    const digits = phone.replace(/\D/g, "").slice(-10) || "unknown";
    const typedEmail = email.trim();
    const typedAddress = address.trim();
    const missing = [
      typedEmail ? "" : "No email provided, contact by phone.",
      typedAddress ? "" : "No address provided, ask on the call.",
    ].filter(Boolean);

    const summary = [
      formatAnswers(answers),
      ...missing,
      `Marketing opt in: ${marketingConsent ? "yes" : "no"}`,
      marketingConsent ? MARKETING_CONSENT_TEXT : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const body = {
      full_name: name.trim(),
      email: typedEmail || `no-email.${digits}@savvyswim.com`,
      phone: phone.trim(),
      address: typedAddress || "Address not provided",
      postal_code: typedAddress ? extractZip(typedAddress) : null,
      pool_details: "Free inspection from the pool care survey",
      message: summary.slice(0, 2000),
      notes: summary.slice(0, 2000),
      sms_opt_in: consent,
      contact_consent: consent,
      consent_text: CONSENT_TEXT,
      source: attr.campaign_code ? `survey_${attr.campaign_code}` : "survey",
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
      elapsed_ms: Math.max(0, Date.now() - openedAt.current),
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
        trackSiteEvent("lead_click", "survey_submitted");
        void import("@/lib/meta-pixel").then((m) => m.metaTrackLead({ content_name: "survey" }));
        void navigate({
          to: "/thank-you",
          search: {
            kind: "survey",
            email: email.trim(),
            ...(data.reference ? { ref: data.reference } : {}),
          },
        });
        return;
      }
      setError(data.error || `We couldn't send that just now. Try again, or call ${PHONE}.`);
    } catch {
      setError(`Network hiccup. Try again, or call ${PHONE}.`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="bg-[#F4EFE3] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <header className="border border-[#8E1F2C]/20 bg-white p-5 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1FA9BE]">
            Savvy Swim Pool Care Survey
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase leading-tight text-[#8E1F2C] sm:text-3xl">
            Switch to Savvy Swim and your first inspection is FREE
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#2a1013]/75">
            No commitment required. We run a full water test, check your entire system, and hand you
            a complete report. Switch, and your first filter cleaning is free too.
          </p>
        </header>

        <div className="mt-4 border border-[#8E1F2C]/20 bg-white p-5 sm:p-7">
          <div className="mb-6">
            <div className="h-1.5 w-full bg-[#8E1F2C]/10">
              <div
                className="h-full bg-[#1FA9BE] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#2a1013]/50">
              {answered} of {questions.length} answered, takes about a minute
            </p>
          </div>

          <form ref={formRef} onSubmit={submit} noValidate>
            <div className="space-y-8">
              {questions.map((current, index) => (
                <div key={current.id} data-field={current.id}>
                  <h2 className="text-[15px] font-semibold leading-snug text-[#2a1013]">
                    <span className="mr-2 text-[#1FA9BE]">{index + 1}.</span>
                    {current.label}
                    {current.optional ? (
                      <span className="ml-1 font-normal text-[#2a1013]/50">(optional)</span>
                    ) : null}
                  </h2>

                  {current.kind === "text" ? (
                    <textarea
                      rows={3}
                      value={(answers[current.id] as string) ?? ""}
                      onChange={(e) => setAnswer(current.id, e.target.value)}
                      placeholder={current.placeholder ?? ""}
                      className={cn(FIELD, "mt-3")}
                    />
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(current.options ?? []).map((option) => {
                        const picked =
                          current.kind === "multi"
                            ? Array.isArray(answers[current.id]) &&
                              (answers[current.id] as string[]).includes(option)
                            : answers[current.id] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setErrors((prev) => {
                                const { [current.id]: _removed, ...rest } = prev;
                                return rest;
                              });
                              if (current.kind === "multi") {
                                togglePick(current.id, option, current.maxPicks ?? 2);
                              } else {
                                setAnswer(current.id, option);
                              }
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 border px-4 py-3 text-left text-sm transition-colors",
                              picked
                                ? "border-[#8E1F2C] bg-[#8E1F2C]/5 font-semibold text-[#8E1F2C]"
                                : "border-[#8E1F2C]/20 bg-white text-[#2a1013] hover:border-[#8E1F2C]/50",
                            )}
                            aria-pressed={picked}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "h-4 w-4 shrink-0 border",
                                picked ? "border-[#8E1F2C] bg-[#8E1F2C]" : "border-[#8E1F2C]/40",
                              )}
                            />
                            {option}
                          </button>
                        );
                      })}
                      {current.kind === "multi" ? (
                        <p className="pt-1 text-[11px] text-[#2a1013]/55">
                          Pick up to {current.maxPicks ?? 2}. Tap again to unselect.
                        </p>
                      ) : null}
                    </div>
                  )}

                  {errors[current.id] ? (
                    <p className="mt-2 text-[12px] font-medium text-[#8E1F2C]">
                      {errors[current.id]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-10 border-t border-[#8E1F2C]/15 pt-6">
              <h2 className="text-lg font-semibold text-[#2a1013]">
                Where do we send your free inspection?
              </h2>

              <div className="mt-4 space-y-3">
                <label className="block" data-field="name">
                  <span className="sr-only">Full name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                    className={FIELD}
                  />
                  {errors['name'] ? (
                    <p className="mt-1 text-[12px] font-medium text-[#8E1F2C]">{errors['name']}</p>
                  ) : null}
                </label>

                <label className="block" data-field="phone">
                  <span className="sr-only">Phone number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className={FIELD}
                  />
                  {errors['phone'] ? (
                    <p className="mt-1 text-[12px] font-medium text-[#8E1F2C]">{errors['phone']}</p>
                  ) : null}
                </label>

                <label className="block" data-field="email">
                  <span className="sr-only">Email address</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className={FIELD}
                  />
                  {errors['email'] ? (
                    <p className="mt-1 text-[12px] font-medium text-[#8E1F2C]">{errors['email']}</p>
                  ) : null}
                </label>

                <div>
                  <span className="sr-only">Pool address or zip code</span>
                  <AddressAutocomplete
                    name="address"
                    value={address}
                    placeholder="Pool address or zip (optional)"
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
                  {placeId ? (
                    <AddressMapPreview placeId={placeId} address={address} className="h-40" />
                  ) : null}
                </div>

                <div data-field="consent">
                  <label className="flex cursor-pointer items-start gap-3 border border-[#8E1F2C]/20 bg-white/60 p-3">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#8E1F2C]"
                    />
                    <span className="text-[11px] leading-relaxed text-[#2a1013]/70">
                      <strong className="text-[#2a1013]">Required.</strong> I authorize{" "}
                      <strong className="text-[#2a1013]">Savvy Swim</strong> to contact me by phone
                      call, text message and email about this request, including automated or
                      prerecorded messages and appointment updates at the number I provided. Message
                      and data rates may apply; message frequency varies. Reply{" "}
                      <strong>STOP</strong> to opt out or <strong>HELP</strong> for help. I have
                      read and agree to the{" "}
                      <Link to="/privacy-policy" className={LEGAL_LINK}>
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms-and-conditions" className={LEGAL_LINK}>
                        Terms
                      </Link>
                      .
                    </span>
                  </label>
                  {errors['consent'] ? (
                    <p className="mt-1 text-[12px] font-medium text-[#8E1F2C]">
                      {errors['consent']}
                    </p>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-start gap-3 border border-[#1FA9BE]/35 bg-[#1FA9BE]/5 p-3">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#1FA9BE]"
                  />
                  <span className="text-[11px] leading-relaxed text-[#2a1013]/70">
                    <strong className="text-[#2a1013]">Optional.</strong> I also agree to receive
                    marketing from <strong className="text-[#2a1013]">Savvy Swim</strong> by text
                    message and email, including promotions, seasonal pool reminders, service offers
                    and company news, sent with automated technology at the number and email I
                    provided. Consent is not a condition of any purchase. Message and data rates may
                    apply; message frequency varies. Reply <strong>STOP</strong> to opt out of
                    texts, or use the unsubscribe link in any email. See the{" "}
                    <Link to="/privacy-policy" className={LEGAL_LINK}>
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link to="/terms-and-conditions" className={LEGAL_LINK}>
                      Terms
                    </Link>
                    .
                  </span>
                </label>
              </div>

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

              <div aria-live="polite" className="min-h-[1.25rem] pt-3">
                {error ? (
                  <p className="text-sm font-medium text-[#8E1F2C]">
                    {error}{" "}
                    <a href={`tel:+18176637665`} className="underline">
                      Call {PHONE}
                    </a>
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={sending}
                className="mt-3 min-h-[52px] w-full bg-[#8E1F2C] px-6 font-semibold uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
              >
                {sending ? "Sending…" : "Claim my free inspection"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
