import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BundleItem = {
  /** Source row id when it came from the price book / add-ons, else a local id. */
  ref: string;
  source: "price_book" | "addon" | "custom";
  name: string;
  price: number;
  qty: number;
};

export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  billing: "monthly" | "one_time";
  price: number;
  price_mode: "sum" | "fixed";
  show_item_prices: boolean;
  items: BundleItem[];
  is_active: boolean;
  sort_order: number;
};

export const BUNDLE_CATEGORIES = [
  "Residential Income",
  "Commercial Income",
  "Repair Income",
  "Construction Income",
];

/** A bundle either charges the sum of what's inside it, or a fixed package price. */
export function bundleSum(items: BundleItem[]) {
  return items.reduce((t, i) => t + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
}

export function bundleTotal(b: Pick<Bundle, "items" | "price" | "price_mode">) {
  return b.price_mode === "fixed" ? Number(b.price) || 0 : bundleSum(b.items);
}

type AnyRow = {
  id?: unknown; name?: unknown; description?: unknown; category?: unknown; billing?: unknown;
  price?: unknown; price_mode?: unknown; show_item_prices?: unknown; is_active?: unknown;
  sort_order?: unknown; items?: unknown;
};
type AnyItem = { ref?: unknown; id?: unknown; source?: unknown; name?: unknown; price?: unknown; qty?: unknown };

function normalize(row: AnyRow): Bundle {
  const rawItems: AnyItem[] = Array.isArray(row.items) ? (row.items as AnyItem[]) : [];
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: (row.description as string | null) ?? null,
    category: String(row.category ?? BUNDLE_CATEGORIES[0]),
    billing: row.billing === "one_time" ? "one_time" : "monthly",
    price: Number(row.price ?? 0),
    price_mode: row.price_mode === "fixed" ? "fixed" : "sum",
    show_item_prices: !!row.show_item_prices,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    items: rawItems.map((i, n) => ({
      ref: String(i.ref ?? i.id ?? `item-${n}`),
      source: (i.source as BundleItem["source"]) ?? "custom",
      name: String(i.name ?? ""),
      price: Number(i.price ?? 0),
      qty: Number(i.qty ?? 1),
    })),
  };
}

export function useBundles(activeOnly = false) {
  const [rows, setRows] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    let q = supabase.from("ss_bundles").select("*").order("sort_order").order("name");
    if (activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    setRows((data ?? []).map((r) => normalize(r as AnyRow)));
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, loading, refetch };
}

export type CatalogItem = { ref: string; source: BundleItem["source"]; name: string; price: number };

/** Everything a bundle can be built from: price-book services and rate-card add-ons. */
export function useBundleCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    void (async () => {
      const [pb, ad] = await Promise.all([
        supabase.from("ss_price_book").select("id,name,price,category").eq("is_active", true).order("name"),
        supabase.from("ss_addons").select("id,label,amount,kind").eq("is_active", true).order("sort_order"),
      ]);
      const fromBook: CatalogItem[] = (pb.data ?? []).map((r) => ({
        ref: r.id,
        source: "price_book",
        name: r.name,
        price: Number(r.price ?? 0),
      }));
      const fromAddons: CatalogItem[] = (ad.data ?? [])
        .filter((r) => r.kind === "flat")
        .map((r) => ({ ref: r.id, source: "addon", name: r.label, price: Number(r.amount ?? 0) }));
      setItems([...fromBook, ...fromAddons]);
    })();
  }, []);

  return items;
}

export async function saveBundle(b: Partial<Bundle> & { id?: string }) {
  const payload = {
    name: b.name ?? "",
    description: b.description ?? null,
    category: b.category ?? BUNDLE_CATEGORIES[0],
    billing: b.billing ?? "monthly",
    price_mode: b.price_mode ?? "sum",
    price:
      (b.price_mode ?? "sum") === "fixed" ? Number(b.price ?? 0) : bundleSum(b.items ?? []),
    show_item_prices: !!b.show_item_prices,
    items: (b.items ?? []) as never,
    is_active: b.is_active !== false,
    sort_order: b.sort_order ?? 0,
  };
  return b.id
    ? supabase.from("ss_bundles").update(payload as never).eq("id", b.id)
    : supabase.from("ss_bundles").insert(payload as never);
}

export const deleteBundle = (id: string) => supabase.from("ss_bundles").delete().eq("id", id);
