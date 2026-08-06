import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Waves, ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";

export type CleaningPlan = {
  id: string;
  name: string;
  blurb: string;
  price: string;
  cadence: string;
  items: string[];
  featured: boolean;
  is_active: boolean;
  display_order: number;
};

export default function AdminCleaning() {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState<CleaningPlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav("/auth", { replace: true });
      return;
    }
    if (!isAdmin) refreshRole();
  }, [user, isAdmin, loading, nav, refreshRole]);

  const load = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("cleaning_plans")
      .select("*")
      .order("display_order");
    if (error) toast.error(error.message);
    else setPlans((data ?? []) as CleaningPlan[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const patch = (id: string, p: Partial<CleaningPlan>) =>
    setPlans((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const save = async (plan: CleaningPlan) => {
    setSavingId(plan.id);
    const { error } = await supabase
      .from("cleaning_plans")
      .update({
        name: plan.name,
        blurb: plan.blurb,
        price: plan.price,
        cadence: plan.cadence,
        items: plan.items.filter((i) => i.trim().length > 0),
        featured: plan.featured,
        is_active: plan.is_active,
        display_order: plan.display_order,
      })
      .eq("id", plan.id);
    setSavingId(null);
    if (error) toast.error(error.message);
    else toast.success(`${plan.name} saved`);
  };

  const addPlan = async () => {
    const { data, error } = await supabase
      .from("cleaning_plans")
      .insert({
        name: "New plan",
        blurb: "Describe this plan.",
        price: "$0",
        cadence: "/ month",
        items: ["First included item"],
        display_order: plans.length + 1,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setPlans((p) => [...p, data as CleaningPlan]);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("cleaning_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPlans((p) => p.filter((x) => x.id !== id));
    toast.success("Plan deleted");
  };

  if (loading || (!isAdmin && user)) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        {loading ? "Loading…" : "Checking admin access…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="container-tight flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Waves className="h-5 w-5 text-primary" />
            <span className="font-semibold">Cleaning plans</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/designs"><ArrowLeft className="h-4 w-4 mr-1" /> Designs</Link>
            </Button>
            <Button size="sm" onClick={addPlan}><Plus className="h-4 w-4 mr-1" /> Add plan</Button>
          </div>
        </div>
      </header>

      <main className="container-tight py-10 space-y-6">
        {loadingData ? (
          <p className="text-muted-foreground">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="text-muted-foreground">No plans yet — add one.</p>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Name</Label>
                  <Input value={plan.name} onChange={(e) => patch(plan.id, { name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price</Label>
                  <Input value={plan.price} onChange={(e) => patch(plan.id, { price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cadence</Label>
                  <Input value={plan.cadence} onChange={(e) => patch(plan.id, { cadence: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Short description</Label>
                <Input value={plan.blurb} onChange={(e) => patch(plan.id, { blurb: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label>Included items (one per line)</Label>
                <Textarea
                  rows={6}
                  value={plan.items.join("\n")}
                  onChange={(e) => patch(plan.id, { items: e.target.value.split("\n") })}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.featured}
                    onCheckedChange={(v) => patch(plan.id, { featured: v })}
                  />
                  <Label>Most popular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={(v) => patch(plan.id, { is_active: v })}
                  />
                  <Label>Visible on site</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">Order</Label>
                  <Input
                    type="number"
                    className="w-20"
                    value={plan.display_order}
                    onChange={(e) => patch(plan.id, { display_order: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => remove(plan.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                  <Button size="sm" onClick={() => save(plan)} disabled={savingId === plan.id}>
                    {savingId === plan.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
