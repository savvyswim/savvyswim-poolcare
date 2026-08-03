import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type PricingRow = {
  id: string;
  pool_size: string;
  size_rank: number;
  vegetation_level: string;
  vegetation_rank: number;
  plan_name: string | null;
  sku: string;
  price: number | null;
  price_key: string | null;
  is_active: boolean;
};

type SubRow = {
  id: string;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  plan_name: string | null;
  pool_size: string | null;
  amount: number | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
};

const statusTone: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600",
  trialing: "bg-sky-500/15 text-sky-600",
  past_due: "bg-amber-500/15 text-amber-600",
  canceled: "bg-rose-500/15 text-rose-600",
  incomplete: "bg-muted text-muted-foreground",
};

export function SubscriptionsPanel() {
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s, error }] = await Promise.all([
      supabase
        .from("service_pricing")
        .select("*")
        .order("size_rank")
        .order("vegetation_rank"),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setPricing((p ?? []) as PricingRow[]);
    setSubs((s ?? []) as SubRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const savePrice = async (row: PricingRow) => {
    setSavingId(row.id);
    const { error } = await supabase
      .from("service_pricing")
      .update({ price: row.price, is_active: row.is_active })
      .eq("id", row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`${row.sku} saved`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Pricing matrix</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Monthly service price by pool size and vegetation level. Turn a row on once you set its
          price — inactive rows are hidden from customers.
        </p>
        <div className="space-y-2">
          {pricing.map((row, i) => (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_auto_auto_auto] items-center gap-3 rounded-md border p-3"
            >
              <div className="text-sm font-medium">{row.plan_name ?? row.pool_size}</div>
              <div className="text-sm text-muted-foreground">
                {row.pool_size} · {row.vegetation_level}
              </div>
              <div className="text-xs font-mono text-muted-foreground">{row.sku}</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  className="w-24"
                  type="number"
                  value={row.price ?? ""}
                  onChange={(e) => {
                    const next = [...pricing];
                    next[i] = {
                      ...row,
                      price: e.target.value === "" ? null : Number(e.target.value),
                    };
                    setPricing(next);
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`active-${row.id}`}
                    checked={row.is_active}
                    onCheckedChange={(v) => {
                      const next = [...pricing];
                      next[i] = { ...row, is_active: v };
                      setPricing(next);
                    }}
                  />
                  <Label htmlFor={`active-${row.id}`} className="text-xs">
                    Live
                  </Label>
                </div>
                <Button size="sm" variant="outline" onClick={() => savePrice(row)}>
                  {savingId === row.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Note: changing a price here updates what the site shows. Ask me to sync new amounts to the
          payment provider so cards are charged the new rate.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Subscribers ({subs.length})</h3>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="space-y-3">
            {subs.map((s) => (
              <div key={s.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{s.customer_name ?? "—"}</div>
                    <div className="text-sm text-muted-foreground">{s.email}</div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      statusTone[s.status] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.cancel_at_period_end ? "canceling" : s.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>Plan: {s.plan_name ?? "—"}</div>
                  <div>Amount: {s.amount != null ? `$${s.amount}/mo` : "—"}</div>
                  <div>Phone: {s.phone ?? "—"}</div>
                  <div>Address: {s.address ?? "—"}</div>
                  <div>
                    Renews:{" "}
                    {s.current_period_end
                      ? new Date(s.current_period_end).toLocaleDateString()
                      : "—"}
                  </div>
                  <div>Started: {new Date(s.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
