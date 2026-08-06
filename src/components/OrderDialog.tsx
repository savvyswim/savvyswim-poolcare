import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

export type OrderItem = {
  name: string;
  sku?: string;
  price?: number;
  type: "product" | "cleaning_plan";
};

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  quantity: z.number().int().min(1).max(100),
  notes: z.string().trim().max(2000).optional(),
});

export const OrderDialog = ({
  item,
  open,
  onOpenChange,
}: {
  item: OrderItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    address: "",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    if (open) setDone(false);
  }, [open, item?.name]);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("shop_orders").insert({
      customer_name: parsed.data.customer_name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      item_name: item.name,
      item_sku: item.sku ?? null,
      unit_price: item.price ?? null,
      quantity: parsed.data.quantity,
      order_type: item.type,
      notes: parsed.data.notes || null,
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast.error("We couldn't send your request. Please call us at (469) 744-0379.");
      return;
    }
    setDone(true);
    toast.success("Request received — we'll confirm by phone or email.");
  };

  const isPlan = item?.type === "cleaning_plan";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-amber-brand mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Request received</h3>
            <p className="text-sm text-muted-foreground">
              Your request for <strong>{item?.name}</strong> is in our system. A Savvy Swim
              specialist will confirm pricing, stock, and delivery shortly.
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isPlan ? "Start service" : "Order"} — {item?.name}</DialogTitle>
              <DialogDescription>
                {isPlan
                  ? "Tell us about your pool and we'll schedule your first visit."
                  : "Send your order request. We confirm stock, final price, and delivery before charging anything."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="o-name">Full name</Label>
                  <Input id="o-name" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-email">Email</Label>
                  <Input id="o-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-phone">Phone</Label>
                  <Input id="o-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-qty">{isPlan ? "Pools" : "Quantity"}</Label>
                  <Input
                    id="o-qty"
                    type="number"
                    min={1}
                    max={100}
                    value={form.quantity}
                    onChange={(e) => set("quantity", Number(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-address">Delivery / service address</Label>
                <Input id="o-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-notes">Notes</Label>
                <Textarea id="o-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isPlan ? "Request service start" : "Send order request"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
