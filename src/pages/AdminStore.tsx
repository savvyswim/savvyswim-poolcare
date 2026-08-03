import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Waves, ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { money } from "@/hooks/useCart";
import { PromoCodesPanel } from "@/components/admin/PromoCodesPanel";
import type { Product } from "@/lib/products";

type OrderItem = {
  id: string;
  product_name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  subtotal: number;
  discount: number;
  promo_code: string | null;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  store_order_items: OrderItem[];
};

const STATUSES = ["new", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "invoiced", "paid", "refunded"];

export default function AdminStore() {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
    const [p, o] = await Promise.all([
      supabase.from("products").select("*").order("display_order"),
      supabase
        .from("store_orders")
        .select("*, store_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (p.error) toast.error(p.error.message);
    else setProducts((p.data ?? []) as unknown as Product[]);
    if (o.error) toast.error(o.error.message);
    else setOrders((o.data ?? []) as unknown as Order[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const patch = (id: string, p: Partial<Product>) =>
    setProducts((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const saveProduct = async (p: Product) => {
    setSavingId(p.id);
    const { error } = await supabase
      .from("products")
      .update({
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: Number(p.price) || 0,
        compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
        image_key: p.image_key,
        image_url: p.image_url,
        category: p.category,
        stock_quantity: Number(p.stock_quantity) || 0,
        is_active: p.is_active,
        featured: p.featured,
        display_order: Number(p.display_order) || 0,
      })
      .eq("id", p.id);
    setSavingId(null);
    if (error) toast.error(error.message);
    else toast.success(`${p.name} saved`);
  };

  const addProduct = async () => {
    const stamp = Date.now().toString().slice(-6);
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: "New product",
        slug: `new-product-${stamp}`,
        sku: `SS-NEW-${stamp}`,
        description: "Describe this product.",
        price: 0,
        category: "general",
        stock_quantity: 0,
        is_active: false,
        display_order: products.length + 1,
      })
      .select("*")
      .single();
    if (error) toast.error(error.message);
    else setProducts((ps) => [...ps, data as unknown as Product]);
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setProducts((ps) => ps.filter((p) => p.id !== id));
  };

  const updateOrder = async (
    id: string,
    patchData: { status?: string; payment_status?: string },
  ) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...patchData } : o)));
    const { error } = await supabase.from("store_orders").update(patchData).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Order updated");
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("store_orders").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setOrders((os) => os.filter((o) => o.id !== id));
  };

  if (loading || (user && !isAdmin))
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline">
        <div className="container-tight flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <Waves className="h-5 w-5 text-primary" /> Savvy Swim Store
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to site
          </Link>
        </div>
      </header>

      <main className="container-tight py-10">
        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="promos">Promo codes</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6 space-y-4">
            {loadingData && <Loader2 className="h-5 w-5 animate-spin" />}
            {!loadingData && orders.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
            {orders.map((o) => (
              <Card key={o.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-bold">
                      {o.order_number} · {money(Number(o.total))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {o.customer_name} · {o.email} {o.phone ? `· ${o.phone}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[o.address, o.city, o.state, o.postal_code].filter(Boolean).join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={o.status} onValueChange={(v) => updateOrder(o.id, { status: v })}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={o.payment_status}
                      onValueChange={(v) => updateOrder(o.id, { payment_status: v })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => deleteOrder(o.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 border-t border-hairline pt-3 text-sm space-y-1">
                  {o.store_order_items?.map((i) => (
                    <div key={i.id} className="flex justify-between">
                      <span>
                        {i.quantity} × {i.product_name}{" "}
                        <span className="text-muted-foreground">{i.sku}</span>
                      </span>
                      <span>{money(Number(i.line_total))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-muted-foreground pt-2">
                    <span>Subtotal / tax / delivery</span>
                    <span>
                      {money(Number(o.subtotal))} / {money(Number(o.tax))} /{" "}
                      {money(Number(o.shipping))}
                    </span>
                  </div>
                  {Number(o.discount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Promo {o.promo_code}</span>
                      <span>−{money(Number(o.discount))}</span>
                    </div>
                  )}
                  {o.notes && <p className="pt-2 text-muted-foreground">Notes: {o.notes}</p>}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="mt-6 space-y-4">
            <Button onClick={addProduct}>
              <Plus className="h-4 w-4 mr-1" /> Add product
            </Button>
            {products.map((p) => (
              <Card key={p.id} className="p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SKU</Label>
                    <Input value={p.sku} onChange={(e) => patch(p.id, { sku: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={p.description}
                    onChange={(e) => patch(p.id, { description: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={p.price}
                      onChange={(e) => patch(p.id, { price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Compare at ($)</Label>
                    <Input
                      type="number"
                      value={p.compare_at_price ?? ""}
                      onChange={(e) =>
                        patch(p.id, {
                          compare_at_price: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={p.stock_quantity}
                      onChange={(e) => patch(p.id, { stock_quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      value={p.display_order}
                      onChange={(e) => patch(p.id, { display_order: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Input
                      value={p.category}
                      onChange={(e) => patch(p.id, { category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Built-in image (robot, chemicals, pump, tools)</Label>
                    <Input
                      value={p.image_key ?? ""}
                      onChange={(e) => patch(p.id, { image_key: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Or image URL</Label>
                    <Input
                      value={p.image_url ?? ""}
                      onChange={(e) => patch(p.id, { image_url: e.target.value || null })}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) => patch(p.id, { is_active: v })}
                    />
                    Visible in shop
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={p.featured}
                      onCheckedChange={(v) => patch(p.id, { featured: v })}
                    />
                    Featured
                  </label>
                  <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => saveProduct(p)} disabled={savingId === p.id}>
                      {savingId === p.id ? (
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
          </TabsContent>

          <TabsContent value="promos" className="mt-6">
            <PromoCodesPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
