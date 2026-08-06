import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export type PricingRow = {
  id: string;
  pool_size: string;
  size_rank: number;
  vegetation_level: string;
  vegetation_rank: number;
  plan_name: string | null;
  sku: string;
  price: number | null;
  price_key: string | null;
};

interface SubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
}

export function SubscribeDialog({ open, onOpenChange, planName }: SubscribeDialogProps) {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [size, setSize] = useState<string>("");
  const [veg, setVeg] = useState<string>("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("service_pricing")
      .select("id,pool_size,size_rank,vegetation_level,vegetation_rank,plan_name,sku,price,price_key")
      .eq("is_active", true)
      .order("size_rank")
      .order("vegetation_rank")
      .then(({ data, error }) => {
        if (error) return toast.error("Could not load service options");
        const list = (data ?? []) as PricingRow[];
        setRows(list);
        if (list.length) setSize((s) => s || list[0].pool_size);
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setSubmitting(false);
    }
  }, [open]);

  const sizes = useMemo(
    () =>
      [...new Map(rows.map((r) => [r.pool_size, r.size_rank])).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => name),
    [rows],
  );

  const vegOptions = useMemo(
    () =>
      rows
        .filter((r) => r.pool_size === size)
        .sort((a, b) => a.vegetation_rank - b.vegetation_rank),
    [rows, size],
  );

  useEffect(() => {
    if (vegOptions.length && !vegOptions.some((v) => v.vegetation_level === veg)) {
      setVeg(vegOptions[0].vegetation_level);
    }
  }, [vegOptions, veg]);

  const selected = vegOptions.find((v) => v.vegetation_level === veg) ?? null;

  const submitRequest = async () => {
    if (form.name.trim().length < 2) return toast.error("Please enter your name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      return toast.error("Please enter a valid email");
    if (form.phone.trim().length < 7) return toast.error("Please enter a phone number");

    setSubmitting(true);
    const serviceLabel = [
      planName ?? "Monthly pool service",
      selected?.plan_name ?? size,
      selected?.vegetation_level,
    ]
      .filter(Boolean)
      .join(" · ");

    const bookingId = crypto.randomUUID();
    const { error } = await supabase
      .from("bookings")
      .insert({
      id: bookingId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || "Not provided",
      service: serviceLabel,
      preferred_date: new Date().toISOString().slice(0, 10),
      preferred_time: "Anytime",
      notes: form.notes.trim() || null,
      consent_source_url: window.location.href,
      });
    setSubmitting(false);

    if (error) return toast.error(error.message || "Could not send your request");

    // Office alert (best effort, non-blocking)
    supabase.functions
      .invoke("notify-office-request", {
        body: {
          bookingId,
          requestType: "New quote request",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          service: serviceLabel,
          notes: form.notes.trim() || undefined,
          sourceUrl: window.location.href,
        },
      })
      .catch(() => {
        /* office alert is best effort */
      });

    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <DialogTitle>Request received</DialogTitle>
            <DialogDescription>
              A Savvy Swim specialist will contact you shortly with your custom service quote.
            </DialogDescription>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{planName ?? "Request your service quote"}</DialogTitle>
              <DialogDescription>
                Tell us about your pool and we'll send a custom quote — pricing depends on pool size,
                vegetation and equipment. No obligation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Pool size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                        size === s
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Trees &amp; vegetation around the pool</Label>
                <div className="grid gap-2">
                  {vegOptions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVeg(v.vegetation_level)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${
                        veg === v.vegetation_level
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="flex items-start gap-2 text-left">
                        {veg === v.vegetation_level && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        )}
                        <span>
                          <span className="block font-medium">
                            {v.plan_name ?? v.vegetation_level}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {v.vegetation_level}
                          </span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-name">Full name</Label>
                  <Input
                    id="sub-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-email">Email</Label>
                  <Input
                    id="sub-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-phone">Phone</Label>
                  <Input
                    id="sub-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-address">Service address</Label>
                  <Input
                    id="sub-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sub-notes">Gate code or notes (optional)</Label>
                <Textarea
                  id="sub-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <Button className="w-full" onClick={submitRequest} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Request my custom quote
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We'll confirm your quote by phone or email — no card required.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
