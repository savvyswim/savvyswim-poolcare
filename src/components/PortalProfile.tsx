import { useCallback, useEffect, useState } from "react";
import { Bell, Home, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  gate_code: string | null;
  dog_name: string | null;
  location_notes: string | null;
  preferred_contact: string;
  notify_visits: boolean;
  notify_invoices: boolean;
  notify_reports: boolean;
  notify_marketing: boolean;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_vin: string | null;
};

const VIN_RE = /^[A-HJ-NPR-Z0-9]{11,17}$/;

const CONTACT_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "email", label: "Email", hint: "Reports and receipts land in your inbox" },
  { value: "sms", label: "Text", hint: "Fastest for day-of arrival notes" },
  { value: "phone", label: "Phone call", hint: "We call before anything major" },
];

const NOTIFY_FIELDS: { key: keyof Profile; label: string; hint: string }[] = [
  { key: "notify_visits", label: "Visit reminders", hint: "Day-before reminder and arrival window" },
  { key: "notify_invoices", label: "Invoices & receipts", hint: "New invoice, payment confirmation" },
  { key: "notify_reports", label: "Water reports", hint: "Chemistry results after each service" },
  { key: "notify_marketing", label: "Seasonal tips & offers", hint: "Occasional care tips — never spam" },
];

const inputClass =
  "w-full border border-primary/20 bg-background px-3 py-2 font-tech text-sm text-foreground outline-none focus:border-accent";
const labelClass = "mb-1 block font-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

export default function PortalProfile() {
  const [form, setForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("ss_my_profile" as never);
    const row = ((data as unknown as Profile[]) ?? [])[0] ?? null;
    if (error) toast.error(error.message);
    setForm(row);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    const vin = (form.vehicle_vin ?? "").trim().toUpperCase();
    if (vin && !VIN_RE.test(vin)) {
      toast.error("Enter a valid VIN — 11 to 17 letters or numbers, no I, O or Q.");
      return;
    }
    const year = form.vehicle_year;
    if (year != null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 2)) {
      toast.error("Enter a valid vehicle year.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("ss_portal_update_profile" as never, {
      p_patch: {
        address: form.address ?? "",
        city: form.city ?? "",
        state: form.state ?? "",
        postal_code: form.postal_code ?? "",
        phone: form.phone ?? "",
        email: form.email ?? "",
        gate_code: form.gate_code ?? "",
        dog_name: form.dog_name ?? "",
        location_notes: form.location_notes ?? "",
        vehicle_make: (form.vehicle_make ?? "").trim(),
        vehicle_model: (form.vehicle_model ?? "").trim(),
        vehicle_year: year == null ? "" : String(year),
        vehicle_vin: vin,
        preferred_contact: form.preferred_contact,
        notify_visits: form.notify_visits,
        notify_invoices: form.notify_invoices,
        notify_reports: form.notify_reports,
        notify_marketing: form.notify_marketing,
      },
    } as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Property profile updated — the office has the new details.");
    void load();
  };

  if (loading) {
    return (
      <div className="border border-primary/15 p-6 font-tech text-xs uppercase tracking-wide text-muted-foreground">
        Loading property profile…
      </div>
    );
  }

  if (!form) {
    return (
      <div className="border border-primary/15 p-6 font-tech text-xs uppercase tracking-wide text-muted-foreground">
        No property is linked to this account yet — message the office and we will connect it.
      </div>
    );
  }

  return (
    <section className="border border-primary/15 bg-card">
      <header className="flex items-center gap-2 border-b border-primary/15 px-4 py-3">
        <Home className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="font-tech text-[11px] uppercase tracking-[0.22em] text-primary">Property profile</h2>
      </header>

      <div className="space-y-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="pp-address">Service address</label>
            <input id="pp-address" className={inputClass} maxLength={300} value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pp-city">City</label>
            <input id="pp-city" className={inputClass} maxLength={120} value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="pp-state">State</label>
              <input id="pp-state" className={inputClass} maxLength={60} value={form.state ?? ""}
                onChange={(e) => set("state", e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pp-zip">ZIP</label>
              <input id="pp-zip" className={inputClass} maxLength={20} value={form.postal_code ?? ""}
                onChange={(e) => set("postal_code", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="pp-phone">Phone</label>
            <input id="pp-phone" className={inputClass} maxLength={40} value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pp-email">Email</label>
            <input id="pp-email" type="email" className={inputClass} maxLength={200} value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pp-gate">Gate code</label>
            <input id="pp-gate" className={inputClass} maxLength={60} value={form.gate_code ?? ""}
              onChange={(e) => set("gate_code", e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="pp-dog">Dog on property</label>
            <input id="pp-dog" className={inputClass} maxLength={80} value={form.dog_name ?? ""}
              onChange={(e) => set("dog_name", e.target.value)} placeholder="Name, or leave blank" />
          </div>
          <div className="sm:col-span-2 mt-1 border-t border-primary/10 pt-3">
            <p className={labelClass}>Vehicle on site (for inspections)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="pp-vmake">Make</label>
                <input id="pp-vmake" className={inputClass} maxLength={60} value={form.vehicle_make ?? ""}
                  onChange={(e) => set("vehicle_make", e.target.value)} placeholder="Ford" />
              </div>
              <div>
                <label className={labelClass} htmlFor="pp-vmodel">Model</label>
                <input id="pp-vmodel" className={inputClass} maxLength={60} value={form.vehicle_model ?? ""}
                  onChange={(e) => set("vehicle_model", e.target.value)} placeholder="F-150" />
              </div>
              <div>
                <label className={labelClass} htmlFor="pp-vyear">Year</label>
                <input id="pp-vyear" inputMode="numeric" className={inputClass} maxLength={4}
                  value={form.vehicle_year == null ? "" : String(form.vehicle_year)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                    set("vehicle_year", digits ? Number(digits) : null);
                  }} placeholder="2021" />
              </div>
              <div>
                <label className={labelClass} htmlFor="pp-vvin">VIN</label>
                <input id="pp-vvin" className={`${inputClass} uppercase`} maxLength={17}
                  value={form.vehicle_vin ?? ""}
                  onChange={(e) => set("vehicle_vin", e.target.value.replace(/[^a-hj-npr-zA-HJ-NPR-Z0-9]/g, "").toUpperCase())}
                  placeholder="1FTFW1E52MFA00000" />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="pp-notes">Access notes for the tech</label>
            <textarea id="pp-notes" rows={3} maxLength={1000} className={inputClass}
              value={form.location_notes ?? ""} onChange={(e) => set("location_notes", e.target.value)}
              placeholder="Side gate latch sticks, park on the street, etc." />
          </div>
        </div>

        <div>
          <p className={labelClass}>Preferred contact method</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {CONTACT_OPTIONS.map((opt) => {
              const active = form.preferred_contact === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => set("preferred_contact", opt.value)}
                  aria-pressed={active}
                  className={`border px-3 py-2 text-left transition-colors ${
                    active ? "border-accent bg-accent/10" : "border-primary/20 hover:border-accent"
                  }`}>
                  <span className="block font-tech text-[11px] uppercase tracking-wide text-primary">{opt.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={`${labelClass} flex items-center gap-2`}>
            <Bell className="h-3 w-3 text-accent" aria-hidden="true" /> Notification preferences
          </p>
          <div className="divide-y divide-primary/10 border border-primary/15">
            {NOTIFY_FIELDS.map((f) => {
              const on = Boolean(form[f.key]);
              return (
                <label key={String(f.key)} className="flex cursor-pointer items-start gap-3 px-3 py-3">
                  <input type="checkbox" checked={on} className="mt-1 h-4 w-4 accent-current text-accent"
                    onChange={(e) => set(f.key, e.target.checked as Profile[typeof f.key])} />
                  <span>
                    <span className="block font-tech text-[11px] uppercase tracking-wide text-primary">{f.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{f.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-primary px-4 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </section>
  );
}
