import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MapPin, Plus, Save, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ServiceAddress = {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
  is_default: boolean;
  is_billing: boolean;
};

const inputClass =
  "w-full border border-primary/20 bg-background px-3 py-2 font-tech text-sm text-foreground outline-none focus:border-accent";
const labelClass = "mb-1 block font-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

type Draft = {
  id: string | null;
  label: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  notes: string;
  is_billing: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  label: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  notes: "",
  is_billing: false,
});

export function formatAddress(a: ServiceAddress) {
  return [a.address, a.city, a.state, a.postal_code].filter(Boolean).join(", ");
}

const normalize = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const addressKey = (a: { address: string; city?: string | null; postal_code?: string | null }) =>
  [normalize(a.address), normalize(a.city), normalize(a.postal_code)].join("|");


export default function PortalAddresses({
  customerId,
  selectedId,
  onSelect,
}: {
  customerId: string;
  selectedId: string | null;
  onSelect: (address: ServiceAddress | null) => void;
}) {
  const [rows, setRows] = useState<ServiceAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ss_service_addresses")
      .select("id,customer_id,label,address,city,state,postal_code,notes,is_default,is_billing")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    const list = (data as unknown as ServiceAddress[]) ?? [];
    setRows(list);
    setLoading(false);
    const chosen = list.find((r) => r.id === selectedId) ?? list.find((r) => r.is_default) ?? list[0] ?? null;
    onSelect(chosen ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    if (!draft.address.trim()) {
      toast.error("Add a street address first.");
      return;
    }

    // Same street address can only exist twice: once as a service address and
    // once as the billing copy. Anything beyond that is a duplicate.
    const key = addressKey({ address: draft.address, city: draft.city, postal_code: draft.postal_code });
    const clash = rows.find(
      (r) => r.id !== draft.id && addressKey(r) === key && r.is_billing === draft.is_billing,
    );
    if (clash) {
      toast.error(
        draft.is_billing
          ? "That billing address is already saved."
          : "That address is already saved — tick “Billing address” to keep a separate billing copy.",
      );
      return;
    }

    setSaving(true);
    const payload = {
      customer_id: customerId,
      label: draft.label.trim() || (draft.is_billing ? "Billing address" : "Service address"),
      address: draft.address.trim(),
      city: draft.city.trim() || null,
      state: draft.state.trim() || null,
      postal_code: draft.postal_code.trim() || null,
      notes: draft.notes.trim() || null,
      is_billing: draft.is_billing,
      is_default: rows.length === 0 && !draft.is_billing,
    };
    const { error } = draft.id
      ? await supabase.from("ss_service_addresses").update(payload).eq("id", draft.id)
      : await supabase.from("ss_service_addresses").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(draft.id ? "Address updated." : "Address saved.");
    setDraft(null);
    void load();
  };

  const remove = async (row: ServiceAddress) => {
    const { error } = await supabase.from("ss_service_addresses").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Address removed.");
    void load();
  };

  const makeDefault = async (row: ServiceAddress) => {
    const { error } = await supabase
      .from("ss_service_addresses")
      .update({ is_default: true })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("ss_service_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId)
      .neq("id", row.id);
    toast.success(`${row.label} is now your default for scheduling and notifications.`);
    void load();
  };

  return (
    <section className="border border-primary/15 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 px-4 py-3">
        <h2 className="flex items-center gap-2 font-tech text-[11px] uppercase tracking-[0.22em] text-primary">
          <MapPin className="h-4 w-4 text-accent" aria-hidden="true" /> My service addresses
        </h2>
        <button
          type="button"
          onClick={() => setDraft(draft ? null : emptyDraft())}
          className="inline-flex items-center gap-2 border border-primary/25 px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.18em] text-primary hover:border-accent hover:text-accent"
        >
          {draft ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          {draft ? "Cancel" : "Add address"}
        </button>
      </header>

      <div className="space-y-4 p-4">
        <p className="font-tech text-xs text-muted-foreground">
          Save every property we service, then pick the one you want used for scheduling requests and reminders.
        </p>

        {loading && <p className="font-tech text-xs uppercase tracking-wide text-muted-foreground">Loading addresses…</p>}

        {!loading && rows.length === 0 && !draft && (
          <p className="border border-dashed border-primary/20 p-4 font-tech text-xs text-muted-foreground">
            No saved addresses yet — add your first one above.
          </p>
        )}

        {rows.length > 0 && (
          <ul className="divide-y divide-primary/10 border border-primary/15">
            {rows.map((r) => {
              const active = r.id === selectedId;
              return (
                <li key={r.id} className={`p-3 ${active ? "bg-accent/5" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelect(r)}
                      aria-pressed={active}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-2 font-tech text-[11px] uppercase tracking-wide text-primary">
                        {active ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> : null}
                        {r.label}
                        {r.is_default && (
                          <span className="border border-accent px-1.5 py-0.5 text-[9px] tracking-widest text-accent">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{formatAddress(r)}</span>
                      {r.notes && <span className="mt-1 block text-xs text-muted-foreground">{r.notes}</span>}
                    </button>
                    <div className="flex items-center gap-1.5">
                      {!r.is_default && (
                        <button
                          type="button"
                          onClick={() => makeDefault(r)}
                          aria-label={`Make ${r.label} the default address`}
                          className="border border-primary/20 p-2 text-primary hover:border-accent hover:text-accent"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            id: r.id,
                            label: r.label,
                            address: r.address,
                            city: r.city ?? "",
                            state: r.state ?? "",
                            postal_code: r.postal_code ?? "",
                            notes: r.notes ?? "",
                            is_billing: r.is_billing,
                          })
                        }
                        className="border border-primary/20 px-2 py-1.5 font-tech text-[10px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        aria-label={`Remove ${r.label}`}
                        className="border border-primary/20 p-2 text-primary hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {draft && (
          <div className="grid gap-3 border border-primary/15 p-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="sa-label">Label</label>
              <input id="sa-label" className={inputClass} maxLength={80} value={draft.label}
                placeholder="Main house, Lake house, Office…"
                onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="sa-address">Street address</label>
              <input id="sa-address" className={inputClass} maxLength={300} value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="sa-city">City</label>
              <input id="sa-city" className={inputClass} maxLength={120} value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="sa-state">State</label>
                <input id="sa-state" className={inputClass} maxLength={60} value={draft.state}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
              </div>
              <div>
                <label className={labelClass} htmlFor="sa-zip">ZIP</label>
                <input id="sa-zip" className={inputClass} maxLength={20} value={draft.postal_code}
                  onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="sa-notes">Access notes</label>
              <textarea id="sa-notes" rows={2} maxLength={600} className={inputClass} value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Gate code, dog, parking…" />
            </div>
            <div className="sm:col-span-2">
              <button type="button" onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 bg-primary px-4 py-2 font-tech text-[11px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                {saving ? "Saving…" : draft.id ? "Update address" : "Save address"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
