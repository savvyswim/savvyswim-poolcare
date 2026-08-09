import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ImagePlus, Plus, Send, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { money } from "@/crm/lib/pricing";
import { runAutomations } from "@/crm/lib/automations";

type Review = { name: string; text: string; rating: number };

type Quote = {
  id: string;
  customer_id: string | null;
  title: string;
  intro: string | null;
  hero_image_url: string | null;
  gallery: string[];
  reviews: Review[];
  show_reviews: boolean;
  status: string;
  token: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  valid_until: string | null;
  tax_pct: number;
  accepted_at: string | null;
  accepted_by: string | null;
  contract_template_id: string | null;
};

type Item = {
  id: string;
  quote_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  is_optional: boolean;
  selected: boolean;
  recurring: string | null;
  sort_order: number;
};

const STATUS_TONE: Record<string, "ink" | "aqua" | "green" | "orange"> = {
  draft: "ink",
  sent: "aqua",
  viewed: "orange",
  accepted: "green",
};

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<{ id: string; full_name: string; phone: string | null; email: string | null }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [q, c, t] = await Promise.all([
      supabase
        .from("ss_quotes")
        .select(
          "id,customer_id,title,intro,hero_image_url,gallery,reviews,show_reviews,status,token,recipient_name,recipient_email,recipient_phone,valid_until,tax_pct,accepted_at,accepted_by,contract_template_id",
        )
        .order("created_at", { ascending: false }),
      supabase.from("ss_customers").select("id,full_name,phone,email").order("full_name").limit(400),
      supabase.from("ss_contract_templates").select("id,name,is_default").eq("is_active", true).order("created_at"),
    ]);
    setQuotes((q.data ?? []) as unknown as Quote[]);
    setCustomers((c.data ?? []) as { id: string; full_name: string; phone: string | null; email: string | null }[]);
    setTemplates((t.data ?? []) as { id: string; name: string; is_default: boolean }[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadItems = useCallback(async (quoteId: string) => {
    const { data } = await supabase
      .from("ss_quote_items")
      .select("id,quote_id,name,description,image_url,quantity,unit_price,is_optional,selected,recurring,sort_order")
      .eq("quote_id", quoteId)
      .order("sort_order");
    setItems((data ?? []) as unknown as Item[]);
  }, []);

  useEffect(() => { if (openId) void loadItems(openId); }, [openId, loadItems]);

  const open = quotes.find((q) => q.id === openId) ?? null;

  const totals = useMemo(() => {
    const base = items.filter((i) => !i.is_optional).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const extras = items.filter((i) => i.is_optional && i.selected).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return { base, extras, total: base + extras };
  }, [items]);

  async function createQuote() {
    const { data, error } = await supabase
      .from("ss_quotes")
      .insert({ title: "Savvy Swim proposal" })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    await load();
    setOpenId(data.id);
  }

  async function patch(id: string, values: Partial<Quote>) {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...values } : q)));
    const { error } = await supabase.from("ss_quotes").update(values as never).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function addItem(isOptional: boolean) {
    if (!openId) return;
    const { error } = await supabase.from("ss_quote_items").insert({
      quote_id: openId,
      name: isOptional ? "Optional add-on" : "Service",
      is_optional: isOptional,
      selected: !isOptional,
      unit_price: 0,
      sort_order: items.length,
    });
    if (error) { toast.error(error.message); return; }
    void loadItems(openId);
  }

  async function patchItem(id: string, values: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...values } : i)));
    const { error } = await supabase.from("ss_quote_items").update(values as never).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function removeItem(id: string) {
    await supabase.from("ss_quote_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function copyLink(q: Quote) {
    const link = `${window.location.origin}/quote/${q.token}`;
    void navigator.clipboard.writeText(link);
    toast.success("Customer link copied");
  }

  async function sendQuote(q: Quote) {
    try {
      const { sendQuoteSms } = await import("@/lib/sms.functions");
      const res = await sendQuoteSms({ data: { quoteId: q.id, origin: window.location.origin } });
      toast.success("Proposal texted to the customer");
      await patch(q.id, { status: "sent" });
      void runAutomations("quote_sent", {
        customerId: q.customer_id,
        customerName: q.recipient_name,
        phone: q.recipient_phone,
        amount: totals.total,
        title: q.title,
      });
      return res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the proposal");
      return null;
    }
  }

  const galleryText = (open?.gallery ?? []).join("\n");

  return (
    <div className="space-y-4">
      <SectionTitle title="Savvy Quotes" sub="Photos, reviews and optional add-ons the customer can pick" />

      <button className="ss-btn" onClick={() => void createQuote()}>
        <Plus size={13} /> New proposal
      </button>

      {loading && <EmptyState>Loading proposals…</EmptyState>}
      {!loading && !quotes.length && <EmptyState>No proposals yet.</EmptyState>}

      <div className="space-y-2">
        {quotes.map((q) => (
          <div key={q.id} className="ss-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="text-left" onClick={() => setOpenId(openId === q.id ? null : q.id)}>
                <div className="text-[0.9rem] font-semibold">{q.title}</div>
                <div className="text-[0.7rem] opacity-70">
                  {q.recipient_name ?? "No recipient"} · {new Date().getFullYear()}
                </div>
              </button>
              <div className="flex items-center gap-1.5">
                <Chip tone={STATUS_TONE[q.status] ?? "ink"}>{q.status}</Chip>
                <button className="ss-btn ss-btn-ghost" onClick={() => copyLink(q)}>
                  <Copy size={13} /> Link
                </button>
                <button className="ss-btn" onClick={() => void sendQuote(q)}>
                  <Send size={13} /> Text
                </button>
              </div>
            </div>

            {openId === q.id && open && (
              <div className="mt-3 space-y-4 border-t pt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Title
                    <input className="ss-input mt-1 w-full" value={open.title}
                      onChange={(e) => patch(q.id, { title: e.target.value })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Customer
                    <select className="ss-input mt-1 w-full" value={open.customer_id ?? ""}
                      onChange={(e) => {
                        const cust = customers.find((c) => c.id === e.target.value);
                        void patch(q.id, {
                          customer_id: e.target.value || null,
                          recipient_name: cust?.full_name ?? open.recipient_name,
                          recipient_phone: cust?.phone ?? open.recipient_phone,
                          recipient_email: cust?.email ?? open.recipient_email,
                        });
                      }}>
                      <option value="">— pick a customer —</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Recipient name
                    <input className="ss-input mt-1 w-full" value={open.recipient_name ?? ""}
                      onChange={(e) => patch(q.id, { recipient_name: e.target.value })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Mobile
                    <input className="ss-input mt-1 w-full" value={open.recipient_phone ?? ""}
                      onChange={(e) => patch(q.id, { recipient_phone: e.target.value })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70 sm:col-span-2">
                    Opening note
                    <textarea className="ss-input mt-1 w-full" rows={3} value={open.intro ?? ""}
                      onChange={(e) => patch(q.id, { intro: e.target.value })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Good through
                    <input type="date" className="ss-input mt-1 w-full" value={open.valid_until ?? ""}
                      onChange={(e) => patch(q.id, { valid_until: e.target.value || null })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Agreement template
                    <select className="ss-input mt-1 w-full" value={open.contract_template_id ?? ""}
                      onChange={(e) => patch(q.id, { contract_template_id: e.target.value || null })}>
                      <option value="">Default agreement</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (default)" : ""}</option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[0.62rem] normal-case tracking-normal opacity-60">
                      Used when the customer approves this proposal.
                    </span>
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70">
                    Cover photo URL
                    <input className="ss-input mt-1 w-full" value={open.hero_image_url ?? ""}
                      onChange={(e) => patch(q.id, { hero_image_url: e.target.value || null })} />
                  </label>
                  <label className="text-[0.7rem] uppercase tracking-wide opacity-70 sm:col-span-2">
                    <span className="flex items-center gap-1"><ImagePlus size={12} /> Gallery photo URLs (one per line)</span>
                    <textarea className="ss-input mt-1 w-full" rows={3} defaultValue={galleryText}
                      onBlur={(e) =>
                        patch(q.id, { gallery: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                      } />
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[0.75rem] uppercase tracking-wide opacity-70">Line items</h4>
                    <div className="flex gap-1.5">
                      <button className="ss-btn ss-btn-ghost" onClick={() => void addItem(false)}>
                        <Plus size={12} /> Item
                      </button>
                      <button className="ss-btn ss-btn-ghost" onClick={() => void addItem(true)}>
                        <Plus size={12} /> Optional upsell
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="grid gap-2 border p-2 sm:grid-cols-[1fr_5rem_6rem_auto]">
                        <div className="space-y-1">
                          <input className="ss-input w-full" value={it.name}
                            onChange={(e) => patchItem(it.id, { name: e.target.value })} />
                          <input className="ss-input w-full" placeholder="Short description"
                            value={it.description ?? ""}
                            onChange={(e) => patchItem(it.id, { description: e.target.value })} />
                          <input className="ss-input w-full" placeholder="Photo URL"
                            value={it.image_url ?? ""}
                            onChange={(e) => patchItem(it.id, { image_url: e.target.value || null })} />
                          <label className="flex items-center gap-1.5 text-[0.7rem]">
                            <input type="checkbox" checked={it.is_optional}
                              onChange={(e) => patchItem(it.id, { is_optional: e.target.checked })} />
                            Optional upsell (customer can add it)
                          </label>
                        </div>
                        <input type="number" min={1} className="ss-input" value={it.quantity}
                          onChange={(e) => patchItem(it.id, { quantity: Number(e.target.value) || 1 })} />
                        <input type="number" min={0} step="0.01" className="ss-input" value={it.unit_price}
                          onChange={(e) => patchItem(it.id, { unit_price: Number(e.target.value) || 0 })} />
                        <button className="ss-btn ss-btn-ghost" onClick={() => void removeItem(it.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {!items.length && <EmptyState>No line items yet.</EmptyState>}
                  </div>
                  <div className="mt-2 text-[0.78rem]">
                    Base {money(totals.base)} · Optional selected {money(totals.extras)} ·{" "}
                    <strong>Total {money(totals.total)}</strong>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[0.75rem]">
                    <input type="checkbox" checked={open.show_reviews}
                      onChange={(e) => patch(q.id, { show_reviews: e.target.checked })} />
                    <Star size={12} /> Show customer reviews on the proposal
                  </label>
                  <textarea className="ss-input mt-2 w-full" rows={3}
                    placeholder={'One review per line: Name | 5 | "They saved our pool."'}
                    defaultValue={(open.reviews ?? []).map((r) => `${r.name} | ${r.rating} | ${r.text}`).join("\n")}
                    onBlur={(e) =>
                      patch(q.id, {
                        reviews: e.target.value
                          .split("\n")
                          .map((line) => line.split("|").map((s) => s.trim()))
                          .filter((p) => p[0])
                          .map((p) => ({ name: p[0] ?? "", rating: Number(p[1] ?? 5) || 5, text: p[2] ?? "" })),
                      })
                    } />
                </div>

                {open.accepted_at && (
                  <div className="text-[0.78rem]">
                    Accepted by <strong>{open.accepted_by}</strong> on{" "}
                    {new Date(open.accepted_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
