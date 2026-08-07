import { useMemo, useState } from "react";
import { Boxes, Plus, Trash2, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { money } from "@/crm/lib/pricing";
import {
  BUNDLE_CATEGORIES,
  bundleSum,
  bundleTotal,
  deleteBundle,
  saveBundle,
  useBundleCatalog,
  useBundles,
  type Bundle,
  type BundleItem,
} from "@/crm/lib/bundles";

const blank = (): Bundle => ({
  id: "",
  name: "",
  description: "",
  category: BUNDLE_CATEGORIES[0]!,
  billing: "monthly",
  price: 0,
  price_mode: "sum",
  show_item_prices: false,
  items: [],
  is_active: true,
  sort_order: 0,
});

/**
 * Bundles package existing services and add-ons into one sellable line —
 * e.g. "Signature Pool Care + Filter + Salt Cell". The price is either the
 * sum of what's inside or a fixed package price you set.
 */
export default function BundleManager() {
  const { level } = useSavvyIdentity();
  const canEdit = level === "owner";
  const { rows, loading, refetch } = useBundles();
  const [draft, setDraft] = useState<Bundle | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="ss-label">Bundles</div>
          <p className="text-[0.78rem] opacity-65">
            Group services and add-ons into one package customers can buy in a single line.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="pink">
            <Boxes size={9} /> {rows.length} bundle{rows.length === 1 ? "" : "s"}
          </Chip>
          {canEdit && (
            <button className="ss-btn" onClick={() => setDraft(blank())}>
              <Plus size={13} /> New bundle
            </button>
          )}
        </div>
      </div>

      {loading && <div className="ss-card p-6 text-[0.85rem] opacity-60">Loading bundles…</div>}

      {!loading && !rows.length && (
        <EmptyState>No bundles yet — build one from your price book and add-ons.</EmptyState>
      )}

      <div className="grid gap-2 lg:grid-cols-2">
        {rows.map((b) => (
          <button
            key={b.id}
            type="button"
            className="ss-card p-3 text-left"
            style={{ opacity: b.is_active ? 1 : 0.55 }}
            onClick={() => canEdit && setDraft(b)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[0.95rem] font-semibold leading-tight">{b.name || "Untitled bundle"}</div>
                <div className="text-[0.76rem] opacity-65">{b.description || b.category}</div>
              </div>
              <div className="text-right">
                <div className="ss-num text-[1.1rem] font-bold" style={{ color: "hsl(var(--ss-burgundy))" }}>
                  {money(bundleTotal(b))}
                </div>
                <div className="ss-label" style={{ fontSize: "0.55rem" }}>
                  {b.billing === "monthly" ? "per month" : "one-time"}
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {b.items.map((i) => (
                <div key={i.ref} className="flex items-center justify-between gap-2 text-[0.76rem]">
                  <span className="flex items-center gap-1.5 opacity-80">
                    <Wrench size={10} /> {i.name} {i.qty > 1 && <span className="opacity-55">×{i.qty}</span>}
                  </span>
                  {b.show_item_prices && <span className="ss-num opacity-70">{money(i.price * i.qty)}</span>}
                </div>
              ))}
              {!b.items.length && <span className="text-[0.76rem] opacity-55">No items yet</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone="ink">{b.category}</Chip>
              <Chip tone={b.price_mode === "fixed" ? "gold" : "aqua"}>
                {b.price_mode === "fixed" ? "Fixed package price" : "Sum of items"}
              </Chip>
              {!b.is_active && <Chip tone="burgundy">Inactive</Chip>}
            </div>
          </button>
        ))}
      </div>

      {draft && (
        <BundleEditor
          bundle={draft}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

function BundleEditor({
  bundle,
  onClose,
  onSaved,
}: {
  bundle: Bundle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [b, setB] = useState<Bundle>(bundle);
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState("");
  const catalog = useBundleCatalog();

  const sum = useMemo(() => bundleSum(b.items), [b.items]);
  const total = b.price_mode === "fixed" ? Number(b.price) || 0 : sum;
  const set = (p: Partial<Bundle>) => setB((s) => ({ ...s, ...p }));

  const addItem = (ref: string) => {
    if (ref === "custom") {
      set({
        items: [...b.items, { ref: `custom-${Date.now()}`, source: "custom", name: "", price: 0, qty: 1 }],
      });
      return;
    }
    const c = catalog.find((x) => x.ref === ref);
    if (!c) return;
    set({ items: [...b.items, { ref: `${c.ref}-${Date.now()}`, source: c.source, name: c.name, price: c.price, qty: 1 }] });
  };

  const updItem = (i: number, p: Partial<BundleItem>) =>
    set({ items: b.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  async function save() {
    if (!b.name.trim()) {
      toast.error("Give the bundle a name");
      return;
    }
    setSaving(true);
    const { id, ...rest } = b;
    const { error } = await saveBundle(id ? { ...rest, id } : rest);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Bundle saved");
      onSaved();
    }
  }

  async function remove() {
    if (!b.id) return onClose();
    const { error } = await deleteBundle(b.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Bundle deleted");
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden"
        style={{ background: "hsl(var(--ss-cream))" }}
      >
        <div className="ss-hero rounded-none p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)", fontSize: "0.52rem" }}>
                Products &amp; services
              </div>
              <div className="text-[1.05rem] font-semibold leading-tight">
                {b.id ? "Edit bundle" : "New bundle"}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close">
              <X size={18} color="#fff" />
            </button>
          </div>
        </div>

        <div className="savvy-crm grid flex-1 gap-3 overflow-y-auto p-4 lg:grid-cols-2" style={{ minHeight: 0 }}>
          <div className="space-y-2">
            <div>
              <label className="ss-label">Name *</label>
              <input
                className="ss-input"
                value={b.name}
                placeholder="Signature Pool Care + Filter + Salt Cell"
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="ss-label">Category</label>
                <select className="ss-input" value={b.category} onChange={(e) => set({ category: e.target.value })}>
                  {BUNDLE_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ss-label">Billing</label>
                <select
                  className="ss-input"
                  value={b.billing}
                  onChange={(e) => set({ billing: e.target.value as Bundle["billing"] })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
            </div>
            <div>
              <label className="ss-label">Description</label>
              <textarea
                className="ss-input"
                rows={3}
                value={b.description ?? ""}
                placeholder="Weekly pool & quarterly filter & salt cell cleaning"
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>
            <div className="ss-card p-3">
              <label className="ss-label">Pricing</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(["sum", "fixed"] as const).map((m) => (
                  <button
                    key={m}
                    className={`ss-btn ${b.price_mode === m ? "" : "ss-btn-ghost"}`}
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.6rem" }}
                    onClick={() => set({ price_mode: m, price: m === "fixed" ? total : sum })}
                  >
                    {m === "sum" ? "Sum of items" : "Fixed package price"}
                  </button>
                ))}
              </div>
              {b.price_mode === "fixed" && (
                <div className="mt-2">
                  <label className="ss-label">Package price</label>
                  <input
                    className="ss-input ss-num"
                    type="number"
                    step="0.01"
                    value={b.price}
                    onChange={(e) => set({ price: Number(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-[0.72rem] opacity-65">
                    Items add up to {money(sum)} — this package saves the customer{" "}
                    <strong>{money(Math.max(0, sum - (Number(b.price) || 0)))}</strong>.
                  </p>
                </div>
              )}
            </div>
            <label className="ss-card flex items-center gap-2 p-3 text-[0.8rem]">
              <input
                type="checkbox"
                checked={b.show_item_prices}
                onChange={(e) => set({ show_item_prices: e.target.checked })}
              />
              Show individual prices on quotes and invoices
            </label>
            <label className="ss-card flex items-center gap-2 p-3 text-[0.8rem]">
              <input type="checkbox" checked={b.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
              Active — available on quotes
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="ss-label">Products &amp; services in this bundle</div>
              <select
                className="ss-input w-[190px]"
                value={pick}
                onChange={(e) => {
                  addItem(e.target.value);
                  setPick("");
                }}
              >
                <option value="">Add new +</option>
                {catalog.map((c) => (
                  <option key={c.ref} value={c.ref}>
                    {c.name} — {money(c.price)}
                  </option>
                ))}
                <option value="custom">Custom line…</option>
              </select>
            </div>

            <div className="ss-card overflow-hidden">
              <div
                className="grid grid-cols-[1.6fr_.7fr_.5fr_.7fr_auto] gap-2 px-2 py-1.5 text-[0.6rem] font-semibold uppercase tracking-wide"
                style={{ background: "hsl(var(--ss-ink))", color: "#fff" }}
              >
                <span>Name</span>
                <span>Price</span>
                <span>Qty</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {!b.items.length && (
                <p className="p-3 text-[0.78rem] opacity-60">Nothing in this bundle yet.</p>
              )}
              {b.items.map((i, idx) => (
                <div key={i.ref} className="grid grid-cols-[1.6fr_.7fr_.5fr_.7fr_auto] items-center gap-2 border-b px-2 py-1.5" style={{ borderColor: "hsl(var(--ss-sand))" }}>
                  <input className="ss-input" value={i.name} onChange={(e) => updItem(idx, { name: e.target.value })} />
                  <input
                    className="ss-input ss-num"
                    type="number"
                    step="0.01"
                    value={i.price}
                    onChange={(e) => updItem(idx, { price: Number(e.target.value) || 0 })}
                  />
                  <input
                    className="ss-input ss-num"
                    type="number"
                    min={1}
                    value={i.qty}
                    onChange={(e) => updItem(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                  />
                  <span className="ss-num text-right text-[0.82rem]">{money(i.price * i.qty)}</span>
                  <button
                    aria-label="Remove item"
                    onClick={() => set({ items: b.items.filter((_, j) => j !== idx) })}
                    style={{ color: "hsl(var(--ss-burgundy))" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="ss-label">Total</span>
                <span className="ss-num text-[1.15rem] font-bold" style={{ color: "hsl(var(--ss-burgundy))" }}>
                  {money(total)}
                  <span className="ss-label ml-1" style={{ fontSize: "0.55rem" }}>
                    {b.billing === "monthly" ? "/mo" : "one-time"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t p-3" style={{ borderColor: "hsl(var(--ss-sand))", background: "hsl(var(--ss-white))" }}>
          {b.id && (
            <button className="ss-btn ss-btn-ghost" onClick={() => void remove()} style={{ color: "hsl(var(--ss-burgundy))" }}>
              <Trash2 size={13} /> Delete
            </button>
          )}
          <button className="ss-btn flex-1" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save bundle"}
          </button>
        </div>
      </div>
    </div>
  );
}
