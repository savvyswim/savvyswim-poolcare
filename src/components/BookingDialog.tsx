import { useEffect, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { CalendarIcon, CheckCircle2, Loader2, Mail, Phone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


const EMAIL = "hi@savagepools.us";

const SERVICES = [
  "Weekly Service & Maintenance",
  "Equipment Repair",
  "Green Pool Recovery",
  "Salt & Automation Service",
  "Filter Clean",
  "Surface & Tile Care",
  "On-site Inspection",
  "Not sure — help me decide",
] as const;

const TIMES = [
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
];

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(30)
    .regex(/^[0-9+()\-.\s]+$/, "Phone can only contain digits and + ( ) - ."),
  address: z.string().trim().min(4, "Enter your property address").max(200),
  service: z.string().min(1, "Pick a service"),
  date: z.date({ required_error: "Pick a preferred date" }),
  time: z.string().min(1, "Pick a preferred time"),
  notes: z.string().max(1000).optional().or(z.literal("")),
  smsOptIn: z.boolean().optional(),
});

export type BookingFormValues = z.infer<typeof schema>;

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultService?: string;
}

const STORAGE_KEY = "savage-pools-bookings";

export const BookingDialog = ({ open, onOpenChange, defaultService }: BookingDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | BookingFormValues>(null);
  const [values, setValues] = useState<Partial<BookingFormValues>>({
    service: defaultService ?? "",
    smsOptIn: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDone(null);
      setErrors({});
      setValues((v) => ({ ...v, service: defaultService ?? v.service ?? "" }));
    }
  }, [open, defaultService]);

  const set = <K extends keyof BookingFormValues>(k: K, v: BookingFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fe[issue.path[0] as string] = issue.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const data = parsed.data;
    const consentTimestamp = new Date().toISOString();
    const consentText =
      "I agree to receive SMS text messages from Savvy Swim regarding appointment reminders, quote follow-ups, and marketing updates. Message frequency varies. Message and data rates may apply. Reply STOP to opt-out, HELP for help.";
    const sourceUrl = typeof window !== "undefined" ? window.location.href : null;

    // 1) Server-side write — this is the source of truth for the lead.
    const { error } = await supabase.from("bookings").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      service: data.service,
      preferred_date: format(data.date, "yyyy-MM-dd"),
      preferred_time: data.time,
      notes: data.notes || null,
      sms_opt_in: !!data.smsOptIn,
      sms_consent_at: data.smsOptIn ? consentTimestamp : null,
      sms_consent_text: data.smsOptIn ? consentText : null,
      consent_source_url: sourceUrl,
    });

    if (error) {
      setSubmitting(false);
      toast.error("We couldn't submit your request", {
        description: "Please try again or call us at (469) 744-0379.",
      });
      return;
    }

    // 2) Confirmation email (best effort, non-blocking)
    supabase.functions
      .invoke("send-booking-confirmation", {
        body: {
          name: data.name,
          email: data.email,
          service: data.service,
          preferredDate: format(data.date, "EEE, MMM d, yyyy"),
          preferredTime: data.time,
          address: data.address || undefined,
          notes: data.notes || undefined,
        },
      })
      .catch(() => {
        /* confirmation email is best effort */
      });

    // 2b) Office alert (best effort, non-blocking)
    supabase.functions
      .invoke("notify-office-request", {
        body: {
          requestType: "New booking request",
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          address: data.address || undefined,
          service: data.service,
          preferredDate: format(data.date, "EEE, MMM d, yyyy"),
          preferredTime: data.time,
          notes: data.notes || undefined,
          sourceUrl: sourceUrl || undefined,
        },
      })
      .catch(() => {
        /* office alert is best effort */
      });


    // 3) Local copy (best effort, non-blocking)
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      existing.push({
        ...data,
        smsOptIn: !!data.smsOptIn,
        smsConsentAt: data.smsOptIn ? consentTimestamp : null,
        smsConsentText: data.smsOptIn ? consentText : null,
        consentSourceUrl: sourceUrl,
        date: format(data.date, "yyyy-MM-dd"),
        createdAt: consentTimestamp,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      /* ignore */
    }

    setSubmitting(false);
    setDone(data);
    toast.success("Booking received — we'll confirm shortly", {
      description: `${format(data.date, "EEE, MMM d")} · ${data.time}`,
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto bg-ink border border-hairline">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-brand/15 border border-amber-brand/40 grid place-items-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-amber-brand" />
            </div>
            <DialogTitle className="text-2xl">You're booked in</DialogTitle>
            <DialogDescription className="mt-2 text-base">
              We've received your request for{" "}
              <span className="text-foreground font-semibold">{done.service}</span> on{" "}
              <span className="text-foreground font-semibold">
                {format(done.date, "EEE, MMM d")} at {done.time}
              </span>
              . A specialist will confirm by phone or email within one business day.
            </DialogDescription>
            <p className="mt-3 text-xs text-muted-foreground">
              SMS updates: {done.smsOptIn ? (
                <span className="text-amber-brand font-semibold">Opted in ✓</span>
              ) : (
                <span>Not opted in — we'll only contact you by phone or email.</span>
              )}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href="tel:+14697440379"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-cta hover:brightness-110 transition"
              >
                <Phone className="h-4 w-4" /> Call us now
              </a>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-brand mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Free · No obligation
              </div>
              <DialogTitle className="text-2xl sm:text-3xl">
                Book your inspection or 3D quote
              </DialogTitle>
              <DialogDescription>
                Pick a time — we'll confirm by phone or email within one business day.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name" error={errors.name}>
                  <Input
                    autoComplete="name"
                    value={values.name ?? ""}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Jane Doe"
                  />
                </Field>
                <Field label="Phone" error={errors.phone}>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    value={values.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="(469) 555-0199"
                  />
                </Field>
              </div>

              <label className="flex gap-3 items-start rounded-md border border-hairline bg-ink-soft/40 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!values.smsOptIn}
                  onChange={(e) => set("smsOptIn", e.target.checked)}
                  className="mt-1 h-4 w-4 accent-amber-brand shrink-0"
                />
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  I agree to receive SMS text messages from <strong className="text-foreground">Savvy Swim</strong>.
                  By checking this box, you consent to receive text messages from
                  Savvy Swim regarding appointment reminders, quote follow-ups,
                  and marketing updates. Message frequency varies. Message and data
                  rates may apply. You can reply <strong>STOP</strong> to opt-out at
                  any time or <strong>HELP</strong> for more information. Read our{" "}
                  <a href="/privacy" target="_blank" rel="noopener" className="underline text-amber-brand">Privacy Policy</a>{" "}
                  and{" "}
                  <a href="/terms" target="_blank" rel="noopener" className="underline text-amber-brand">Terms &amp; Conditions</a>.
                </span>
              </label>

              <Field label="Email" error={errors.email}>
                <Input
                  type="email"
                  autoComplete="email"
                  value={values.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@email.com"
                />
              </Field>

              <Field label="Property address" error={errors.address}>
                <Input
                  autoComplete="street-address"
                  value={values.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="123 Lakeshore Dr, Austin, TX"
                />
              </Field>

              <Field label="Service" error={errors.service}>
                <Select
                  value={values.service ?? ""}
                  onValueChange={(v) => set("service", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="What can we help with?" />
                  </SelectTrigger>
                  <SelectContent className="bg-ink border-hairline">
                    {SERVICES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Preferred date" error={errors.date}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !values.date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {values.date ? format(values.date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-ink border-hairline" align="start">
                      <Calendar
                        mode="single"
                        selected={values.date}
                        onSelect={(d) => d && set("date", d)}
                        disabled={(d) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return d < today;
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field label="Preferred time" error={errors.time}>
                  <Select
                    value={values.time ?? ""}
                    onValueChange={(v) => set("time", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a time" />
                    </SelectTrigger>
                    <SelectContent className="bg-ink border-hairline max-h-64">
                      {TIMES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Project notes (optional)" error={errors.notes}>
                <Textarea
                  rows={3}
                  value={values.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Lot size, style you love, budget range, timing…"
                  maxLength={1000}
                />
              </Field>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-amber-brand text-primary-foreground hover:brightness-110 shadow-cta h-12 text-sm font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Booking…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" /> Confirm booking
                    </>
                  )}
                </Button>
                <a
                  href="tel:+14697440379"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-ink-soft/60 px-5 h-12 text-sm font-semibold text-foreground hover:bg-ink-soft transition"
                >
                  <Phone className="h-4 w-4" /> Call instead
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                By booking you agree to be contacted about your project. We never share your info.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</Label>
    {children}
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
  </div>
);
