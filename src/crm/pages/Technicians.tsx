import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity, useTable } from "@/crm/lib/useSavvy";

type Staff = {
  id: string; full_name: string; email: string | null; phone: string | null;
  level: string; initials: string | null; is_active: boolean; user_id: string | null;
};

const LEVELS = [
  { value: "technician", label: "Pool tech — route, jobs and alerts only" },
  { value: "contractor", label: "Contractor — only their assigned stops" },
  { value: "office_manager", label: "Office manager — customers, routes, books" },
  { value: "owner", label: "Owner — everything" },
];

const initialsFrom = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || null;

export default function Technicians() {
  const id = useSavvyIdentity();
  const canManage = id.level === "owner" || id.level === "office_manager";
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", level: "technician" });

  const { rows, refetch: reload } = useTable<Staff>("staff", async () => {
    const { data } = await supabase
      .from("ss_staff")
      .select("id,full_name,email,phone,level,initials,is_active,user_id")
      .order("level")
      .order("full_name");
    return (data ?? []) as Staff[];
  });

  const save = async () => {
    if (form.full_name.trim().length < 2) return toast.error("Enter the person's full name");
    setSaving(true);
    try {
      const { error } = await supabase.from("ss_staff").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        level: form.level as Staff["level"] as never,
        initials: initialsFrom(form.full_name),
      });
      if (error) throw error;
      toast.success(`${form.full_name.trim()} added to the team`);
      setForm({ full_name: "", email: "", phone: "", level: "technician" });
      setAdding(false);
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not add that team member");
    } finally {
      setSaving(false);
    }
  };

  const sendLogin = async (s: Staff) => {
    if (!s.email) return toast.error("Add an email to that team member first");
    setInviting(s.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-staff", {
        body: { staff_id: s.id, origin: window.location.origin },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Login invite sent to ${s.email}`);
      await reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send that login invite");
    } finally {
      setInviting(null);
    }
  };

  const toggleActive = async (s: Staff) => {
    const { error } = await supabase.from("ss_staff").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error("Could not update that member");
    await reload();
  };

  const changeLevel = async (s: Staff, level: string) => {
    const { error } = await supabase
      .from("ss_staff")
      .update({ level: level as never })
      .eq("id", s.id);
    if (error) return toast.error("Could not change that role");
    toast.success(`${s.full_name} is now ${level.replace("_", " ")}`);
    await reload();
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Team"
        sub={`${rows.filter((r) => r.is_active).length} active members`}
        right={
          canManage ? (
            <button className="ss-btn" onClick={() => setAdding((v) => !v)}>
              <UserPlus size={13} /> Add team member
            </button>
          ) : undefined
        }
      />

      {canManage && adding && (
        <div className="ss-card space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input className="ss-input" placeholder="Full name" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className="ss-input" placeholder="Email" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="ss-input" placeholder="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select className="ss-input" value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <p className="text-[0.72rem] opacity-60">
            This creates their staff record so you can assign routes right away. Send them a login separately from the
            customer/team invite flow when they need portal access.
          </p>
          <div className="flex justify-end gap-2">
            <button className="ss-btn ss-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="ss-btn" disabled={saving} onClick={save}>{saving ? "Adding…" : "Add to team"}</button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {!rows.length && <EmptyState>No staff records.</EmptyState>}
        {rows.map((s) => (
          <div key={s.id} className="ss-card flex items-center gap-3 p-3.5">
            <div
              className="ss-num flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold"
              style={{ background: "hsl(var(--ss-burgundy))", color: "#fff" }}
            >
              {s.initials ?? s.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[0.9rem] font-semibold">{s.full_name}</div>
              <div className="truncate text-[0.73rem] opacity-65">{s.email} · {s.phone}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Chip tone={s.level === "owner" ? "burgundy" : s.level === "office_manager" ? "gold" : s.level === "contractor" ? "orange" : "aqua"}>
                  {s.level === "technician" ? "pool tech" : s.level.replace("_", " ")}
                </Chip>
                <Chip tone={s.is_active ? "green" : "orange"}>{s.is_active ? "active" : "inactive"}</Chip>
              </div>
              {canManage && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <select
                    className="ss-input !py-1 text-[0.72rem]"
                    style={{ maxWidth: 150 }}
                    value={s.level}
                    onChange={(e) => changeLevel(s, e.target.value)}
                  >
                    <option value="technician">Pool tech</option>
                    <option value="contractor">Contractor</option>
                    <option value="office_manager">Office manager</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button
                    className="ss-btn ss-btn-ghost !py-1 text-[0.72rem]"
                    disabled={inviting === s.id || !!s.user_id}
                    onClick={() => sendLogin(s)}
                  >
                    {s.user_id ? "Login active" : inviting === s.id ? "Sending…" : "Send login"}
                  </button>
                  <button className="ss-btn ss-btn-ghost !py-1 text-[0.72rem]" onClick={() => toggleActive(s)}>
                    {s.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
