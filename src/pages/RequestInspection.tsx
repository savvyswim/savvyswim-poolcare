import { useState } from "react";
import { Link } from "@/lib/router-compat";
import { Phone, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
import { getAttribution, getSessionId, trackContactClick } from "@/lib/contactTracking";

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

const RequestInspection = () => {
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [contactTime, setContactTime] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      postal_code: String(fd.get("postal_code") ?? ""),
      preferred_date: String(fd.get("preferred_date") ?? ""),
      pool_details: String(fd.get("pool_details") ?? ""),
      preferred_contact_time: contactTime,
      notes: String(fd.get("notes") ?? ""),
    };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

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
      toast.error("Something went wrong — please call us at " + PHONE_DISPLAY);
      return;
    }

    setReference(data.reference_number);
    void notifyInspectionRequest({ data: { requestId: data.id } }).catch((err) =>
      console.warn("inspection notification not sent", err),
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
            <p className="mt-4 text-muted-foreground">
              Your reference number is{" "}
              <span className="font-tech text-foreground">{reference}</span>. We just texted you a
              confirmation with next steps — a tech reviews your address within one business day and
              sends two visit windows to choose from.
            </p>
            <a
              href={PHONE_HREF}
              onClick={() => trackContactClick("call_click", "inspection_confirmation")}
              className="btn-quote mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-[13px] font-bold uppercase tracking-wide transition"
            >
              <Phone className="h-4 w-4" /> Call us now
            </a>
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

            <form onSubmit={onSubmit} className="space-y-5 lg:col-span-7">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name *</Label>
                  <Input id="full_name" name="full_name" required maxLength={120} autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile phone *</Label>
                  <Input id="phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Property address *</Label>
                  <Input id="address" name="address" required maxLength={300} autoComplete="street-address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">ZIP *</Label>
                  <Input id="postal_code" name="postal_code" required maxLength={20} autoComplete="postal-code" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preferred_date">Preferred service date</Label>
                  <Input id="preferred_date" name="preferred_date" type="date" />
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

              <button
                type="submit"
                disabled={submitting}
                className="btn-quote inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-[13px] font-bold uppercase tracking-wide transition disabled:opacity-60"
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
