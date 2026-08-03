import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

export type PromoCode = {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_subtotal: number;
  max_redemptions: number | null;
  times_used: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

const toLocalInput = (v: string | null) => (v ? v.slice(0, 10) : "");
const fromLocalInput = (v: string) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);

export const PromoCodesPanel = ({ onCount }: { onCount?: (n: number) => void }) => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else {
      setCodes((data ?? []) as unknown as PromoCode[]);
      onCount?.((data ?? []).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (id: string, p: Partial<PromoCode>) =>
    setCodes((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const add = async () => {
    const stamp = Date.now().toString().slice(-5);
    const { data, error } = await supabase
      .from("promo_codes")
      .insert({
        code: `SAVE${stamp}`,
        description: "New discount code",
        discount_type: "percent",
        discount_value: 10,
        is_active: false,
      })
      .select("*")
      .single();
    if (error) toast.error(error.message);
    else {
      setCodes((cs) => [data as unknown as PromoCode, ...cs]);
      onCount?.(codes.length + 1);
    }
  };

  const save = async (c: PromoCode) => {
    setSavingId(c.id);
    const { error } = await supabase
      .from("promo_codes")
      .update({
        code: c.code.trim().toUpperCase(),
        description: c.description,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value) || 0,
        min_subtotal: Number(c.min_subtotal) || 0,
        max_redemptions: c.max_redemptions ? Number(c.max_redemptions) : null,
        starts_at: c.starts_at,
        expires_at: c.expires_at,
        is_active: c.is_active,
      })
      .eq("id", c.id);
    setSavingId(null);
    if (error) toast.error(error.message);
    else toast.success(`${c.code.toUpperCase()} saved`);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setCodes((cs) => cs.filter((c) => c.id !== id));
      onCount?.(codes.length - 1);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Add promo code
      </Button>
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {!loading && codes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No promo codes yet. Add one, set the discount, then switch it live.
        </p>
      )}
      {codes.map((c) => (
        <Card key={c.id} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code (what customers type)</Label>
              <Input
                value={c.code}
                onChange={(e) => patch(c.id, { code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Internal note</Label>
              <Input
                value={c.description}
                onChange={(e) => patch(c.id, { description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={c.discount_type}
                onValueChange={(v) => patch(c.id, { discount_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">% off</SelectItem>
                  <SelectItem value="fixed">$ off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{c.discount_type === "percent" ? "Percent off" : "Dollars off"}</Label>
              <Input
                type="number"
                value={c.discount_value}
                onChange={(e) => patch(c.id, { discount_value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Min subtotal ($)</Label>
              <Input
                type="number"
                value={c.min_subtotal}
                onChange={(e) => patch(c.id, { min_subtotal: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max uses (blank = unlimited)</Label>
              <Input
                type="number"
                value={c.max_redemptions ?? ""}
                onChange={(e) =>
                  patch(c.id, { max_redemptions: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input
                type="date"
                value={toLocalInput(c.starts_at)}
                onChange={(e) => patch(c.id, { starts_at: fromLocalInput(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expires</Label>
              <Input
                type="date"
                value={toLocalInput(c.expires_at)}
                onChange={(e) => patch(c.id, { expires_at: fromLocalInput(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={c.is_active}
                onCheckedChange={(v) => patch(c.id, { is_active: v })}
              />
              Live at checkout
            </label>
            <span className="text-sm text-muted-foreground">
              Used {c.times_used}
              {c.max_redemptions ? ` / ${c.max_redemptions}` : ""} times
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button onClick={() => save(c)} disabled={savingId === c.id}>
                {savingId === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
