import { useState } from "react";
import { Mail, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type LabeledContact = { label: string; value: string };

const PHONE_LABELS = ["Mobile", "Home", "Work", "Spouse", "Property manager", "Other"];
const EMAIL_LABELS = ["Primary", "Billing", "Spouse", "Property manager", "Other"];

/**
 * The parts of a customer record that don't fit the summary header:
 * extra phones and emails with labels, codes, the dog's name, how long the
 * stop takes, and how this pool is rated.
 */
export default function CustomerDepth({
  customer,
  canEdit,
  onSaved,
}: {
  customer: {
    id: string;
    customer_code: string | null;
    location_code: string | null;
    dog_name: string | null;
    minutes_at_stop: number | null;
    location_notes: string | null;
    rate_type: string | null;
    labor_cost_type: string | null;
    phones: LabeledContact[] | null;
    emails: LabeledContact[] | null;
  };
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const [phones, setPhones] = useState<LabeledContact[]>(customer.phones ?? []);
  const [emails, setEmails] = useState<LabeledContact[]>(customer.emails ?? []);

  async function patch(p: Record<string, unknown>) {
    const { error } = await supabase.from("ss_customers").update(p as never).eq("id", customer.id);
    if (error) toast.error(error.message);
    else onSaved?.();
  }

  const saveList = (key: "phones" | "emails", list: LabeledContact[]) => {
    const clean = list.filter((c) => c.value.trim());
    void patch({ [key]: clean });
  };

  return (
    <div className="space-y-3">
      <div className="ss-card p-3">
        <div className="ss-label mb-2">Codes & routing</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Customer code" value={customer.customer_code} canEdit={canEdit} onSave={(v) => patch({ customer_code: v || null })} />
          <Field label="Location code" value={customer.location_code} canEdit={canEdit} onSave={(v) => patch({ location_code: v || null })} />
          <Field
            label="Minutes at stop"
            type="number"
            value={customer.minutes_at_stop}
            canEdit={canEdit}
            onSave={(v) => patch({ minutes_at_stop: v === "" ? null : Number(v) })}
          />
          <Field label="Dog's name" value={customer.dog_name} canEdit={canEdit} onSave={(v) => patch({ dog_name: v || null })} />
          <Field label="Rate type" value={customer.rate_type} canEdit={canEdit} placeholder="Flat, per visit…" onSave={(v) => patch({ rate_type: v || null })} />
          <Field label="Labor cost type" value={customer.labor_cost_type} canEdit={canEdit} placeholder="Hourly, per pool…" onSave={(v) => patch({ labor_cost_type: v || null })} />
        </div>
        <div className="mt-2">
          <label className="ss-label">Location notes (gate, parking, access)</label>
          <textarea
            className="ss-input"
            rows={2}
            readOnly={!canEdit}
            defaultValue={customer.location_notes ?? ""}
            onBlur={(e) => void patch({ location_notes: e.target.value || null })}
          />
        </div>
      </div>

      <ContactList
        title="Phone numbers"
        icon={<Phone size={12} />}
        labels={PHONE_LABELS}
        list={phones}
        canEdit={canEdit}
        setList={(l) => {
          setPhones(l);
          saveList("phones", l);
        }}
      />
      <ContactList
        title="Email addresses"
        icon={<Mail size={12} />}
        labels={EMAIL_LABELS}
        list={emails}
        canEdit={canEdit}
        setList={(l) => {
          setEmails(l);
          saveList("emails", l);
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  canEdit,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number | null;
  canEdit: boolean;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="ss-label">{label}</label>
      <input
        className="ss-input"
        type={type}
        placeholder={placeholder}
        readOnly={!canEdit}
        defaultValue={value ?? ""}
        onBlur={(e) => String(e.target.value) !== String(value ?? "") && onSave(e.target.value)}
      />
    </div>
  );
}

function ContactList({
  title,
  icon,
  labels,
  list,
  canEdit,
  setList,
}: {
  title: string;
  icon: React.ReactNode;
  labels: string[];
  list: LabeledContact[];
  canEdit: boolean;
  setList: (l: LabeledContact[]) => void;
}) {
  return (
    <div className="ss-card p-3">
      <div className="ss-label mb-2 flex items-center gap-1.5">
        {icon} {title}
      </div>
      {!list.length && <p className="text-[0.78rem] opacity-60">None added yet.</p>}
      <div className="space-y-2">
        {list.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              className="ss-input w-[150px]"
              disabled={!canEdit}
              value={c.label}
              onChange={(e) => setList(list.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))}
            >
              {labels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <input
              className="ss-input min-w-[180px] flex-1"
              readOnly={!canEdit}
              defaultValue={c.value}
              onBlur={(e) =>
                e.target.value !== c.value &&
                setList(list.map((x, j) => (i === j ? { ...x, value: e.target.value } : x)))
              }
            />
            {canEdit && (
              <button className="ss-btn ss-btn-ghost" aria-label="Remove" onClick={() => setList(list.filter((_, j) => j !== i))}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <button
          className="ss-btn ss-btn-ghost mt-2"
          onClick={() => setList([...list, { label: labels[0]!, value: "" }])}
        >
          <Plus size={13} /> Add
        </button>
      )}
    </div>
  );
}
