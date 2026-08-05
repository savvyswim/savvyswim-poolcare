import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAdminAction } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Waves,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Phone,
  Mail,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";

const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

const PRIORITIES = ["low", "normal", "high"];
const ACTIVITY_TYPES = ["note", "call", "email", "sms", "meeting", "quote", "booking"];

type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  company: string | null;
  source: string;
  tags: string[];
  marketing_opt_in: boolean;
  notes: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  contact_id: string | null;
  title: string;
  service_interest: string | null;
  pool_size: string | null;
  vegetation_level: string | null;
  stage: string;
  priority: string;
  estimated_value: number | null;
  quoted_price: number | null;
  source: string;
  next_follow_up: string | null;
  notes: string | null;
  created_at: string;
};

type Activity = {
  id: string;
  contact_id: string | null;
  lead_id: string | null;
  type: string;
  subject: string | null;
  body: string | null;
  occurred_at: string;
};

type Task = {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  title: string;
  details: string | null;
  due_date: string | null;
  is_done: boolean;
};

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminCRM() {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const nav = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [query, setQuery] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
    const [c, l, a, t] = await Promise.all([
      supabase.from("crm_contacts").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("crm_leads").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("crm_activities").select("*").order("occurred_at", { ascending: false }).limit(500),
      supabase.from("crm_tasks").select("*").order("due_date", { nullsFirst: false }).limit(300),
    ]);
    for (const r of [c, l, a, t]) if (r.error) toast.error(r.error.message);
    setContacts((c.data ?? []) as Contact[]);
    setLeads((l.data ?? []) as Lead[]);
    setActivities((a.data ?? []) as Activity[]);
    setTasks((t.data ?? []) as Task[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const [pricingRows, setPricingRows] = useState<
    {
      id: string;
      pool_size: string;
      vegetation_level: string;
      plan_name: string | null;
      sku: string;
      price: number | null;
      is_active: boolean;
    }[]
  >([]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("service_pricing")
        .select("id,pool_size,vegetation_level,plan_name,sku,price,is_active")
        .order("size_rank")
        .order("vegetation_rank");
      if (active && data) setPricingRows(data as typeof pricingRows);
    })();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const contactById = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])) as Record<string, Contact>,
    [contacts],
  );

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => {
      const c = l.contact_id ? contactById[l.contact_id] : null;
      return [l.title, l.service_interest, l.notes, c?.full_name, c?.email, c?.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [leads, query, contactById]);

  const openLead = leads.find((l) => l.id === openLeadId) ?? null;
  const openContact = openLead?.contact_id ? contactById[openLead.contact_id] : null;
  const leadActivities = activities.filter((a) => a.lead_id === openLeadId);
  const leadTasks = tasks.filter((t) => t.lead_id === openLeadId);

  const stats = useMemo(() => {
    const openLeads = leads.filter((l) => !["won", "lost"].includes(l.stage));
    const won = leads.filter((l) => l.stage === "won");
    const pipeline = openLeads.reduce((s, l) => s + Number(l.quoted_price ?? l.estimated_value ?? 0), 0);
    const overdue = tasks.filter(
      (t) => !t.is_done && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()),
    ).length;
    return { open: openLeads.length, won: won.length, pipeline, overdue };
  }, [leads, tasks]);

  const patchLead = async (id: string, patch: Partial<Lead>) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { error } = await supabase.from("crm_leads").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const changeStage = async (lead: Lead, stage: string) => {
    await patchLead(lead.id, {
      stage,
      ...(["won", "lost"].includes(stage) ? { closed_at: new Date().toISOString() } : { closed_at: null }),
    } as Partial<Lead>);
    await supabase.from("crm_activities").insert({
      lead_id: lead.id,
      contact_id: lead.contact_id,
      type: "note",
      subject: `Stage → ${stage}`,
    });
    logAdminAction({ area: "crm", action: `Lead stage → ${stage}`, recordType: "lead", recordId: lead.id });
    load();
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setOpenLeadId(null);
    logAdminAction({ area: "crm", action: "Lead deleted", recordType: "lead", recordId: id });
    toast.success("Lead deleted");
    load();
  };

  const createLead = async (form: {
    name: string;
    email: string;
    phone: string;
    address: string;
    service: string;
    estimated: string;
    notes: string;
  }) => {
    if (form.name.trim().length < 2) return toast.error("Enter a contact name");
    setBusy(true);
    let contactId: string | null = null;
    const existing = contacts.find(
      (c) => form.email.trim() && c.email?.toLowerCase() === form.email.trim().toLowerCase(),
    );
    if (existing) contactId = existing.id;
    else {
      const { data, error } = await supabase
        .from("crm_contacts")
        .insert({
          full_name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          source: "manual",
        })
        .select("id")
        .single();
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      contactId = data.id;
    }

    const { error } = await supabase.from("crm_leads").insert({
      contact_id: contactId,
      title: form.service.trim() || "New opportunity",
      service_interest: form.service.trim() || null,
      estimated_value: form.estimated ? Number(form.estimated) : null,
      notes: form.notes.trim() || null,
      source: "manual",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    logAdminAction({ area: "crm", action: "Lead created", recordType: "lead", details: { contact: form.name.trim(), service: form.service.trim() } });
    toast.success("Lead created");
    setNewLeadOpen(false);
    load();
  };

  const addActivity = async (type: string, subject: string, body: string) => {
    if (!openLead) return;
    const { error } = await supabase.from("crm_activities").insert({
      lead_id: openLead.id,
      contact_id: openLead.contact_id,
      type,
      subject: subject || null,
      body: body || null,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const addTask = async (title: string, due: string) => {
    if (!openLead || !title.trim()) return;
    const { error } = await supabase.from("crm_tasks").insert({
      lead_id: openLead.id,
      contact_id: openLead.contact_id,
      title: title.trim(),
      due_date: due || null,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const toggleTask = async (task: Task) => {
    const { error } = await supabase
      .from("crm_tasks")
      .update({ is_done: !task.is_done, completed_at: task.is_done ? null : new Date().toISOString() })
      .eq("id", task.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading || (!isAdmin && user)) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="crm-scope min-h-screen bg-background text-foreground">
      <header className="crm-topbar sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white/10">
              <Waves className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-semibold leading-tight tracking-tight">Savvy Swim CRM</h1>
              <p className="text-xs crm-sub">Leads · Contacts · Follow-ups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <Link to="/admin/store">
                <ArrowLeft className="h-4 w-4 mr-1" /> Store
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <Link to="/admin/team">Team</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <Link to="/admin/activity">Activity log</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/85 hover:text-white hover:bg-white/10"
            >
              <Link to="/crm/app">Operations console</Link>
            </Button>
            <Button size="sm" onClick={() => setNewLeadOpen(true)} className="font-semibold">
              <Plus className="h-4 w-4 mr-1" /> Create lead
            </Button>
          </div>
        </div>
      </header>


      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open leads", value: stats.open },
            { label: "Won", value: stats.won },
            { label: "Pipeline value", value: money(stats.pipeline) },
            { label: "Overdue tasks", value: stats.overdue },
          ].map((s) => (
            <div key={s.label} className="crm-panel crm-stat p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="text-2xl font-bold mt-1 tracking-tight">{s.value}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="pipeline" className="space-y-5">
          <TabsList className="crm-tabs">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="plans">Service plans</TabsTrigger>
          </TabsList>


          <TabsContent value="pipeline" className="space-y-4">
            <Input
              placeholder="Search leads by name, email, phone, service…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md bg-card"
            />
            {loadingData ? (
              <div className="py-12 text-center text-muted-foreground">Loading…</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {STAGES.map((stage) => {
                  const items = filteredLeads.filter((l) => l.stage === stage.key);
                  return (
                    <div key={stage.key} className="space-y-2">
                      <div className="crm-col-head flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {stage.label}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2 min-h-[80px]">
                        {items.map((l) => {
                          const c = l.contact_id ? contactById[l.contact_id] : null;
                          return (
                            <div
                              key={l.id}
                              onClick={() => setOpenLeadId(l.id)}
                              className="crm-lead-card p-3 cursor-pointer"
                            >

                              <div className="text-sm font-medium leading-snug">{l.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {c?.full_name ?? "No contact"}
                              </div>
                              <div className="flex items-center justify-between mt-2 text-xs">
                                <span className="text-muted-foreground">{fmtDate(l.created_at)}</span>
                                <span className="font-semibold">
                                  {money(l.quoted_price ?? l.estimated_value)}
                                </span>
                              </div>
                              {l.next_follow_up && (
                                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <CalendarClock className="h-3 w-3" /> {fmtDate(l.next_follow_up)}
                                </div>
                              )}
                            </div>

                          );
                        })}
                        {!items.length && (
                          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                            Empty
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts">
            <Card className="crm-panel divide-y divide-border">
              {contacts.map((c) => (
                <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.email ?? "no email"} · {c.phone ?? "no phone"} · {c.source}
                    </div>
                    {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.phone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${c.phone}`}>
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {c.email && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${c.email}`}>
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!contacts.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">No contacts yet.</div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="crm-panel divide-y divide-border">
              {tasks.map((t) => (
                <label key={t.id} className="p-4 flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={t.is_done} onCheckedChange={() => toggleTask(t)} />
                  <span className="flex-1">
                    <span className={`text-sm ${t.is_done ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">Due {fmtDate(t.due_date)}</span>
                  </span>
                  {t.lead_id && (
                    <Button size="sm" variant="ghost" onClick={() => setOpenLeadId(t.lead_id)}>
                      Open lead
                    </Button>
                  )}
                </label>
              ))}
              {!tasks.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">No tasks yet.</div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="crm-panel divide-y divide-border">
              {activities.slice(0, 100).map((a) => (
                <div key={a.id} className="p-4">
                  <div className="text-sm font-medium">
                    <span className="uppercase text-[10px] tracking-wider text-primary mr-2">{a.type}</span>
                    {a.subject ?? "Activity"}
                  </div>
                  {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(a.occurred_at).toLocaleString()}
                  </div>
                </div>
              ))}
              {!activities.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">No activity yet.</div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card className="crm-panel p-0 overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="text-base font-semibold">Monthly service plans</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Internal rate card. Every plan is weekly service with chemicals included — rate is
                  set by pool size and vegetation level. Prices are not shown on the website.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Pool size</th>
                      <th className="px-4 py-3 font-semibold">Vegetation</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold text-right">Monthly price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">
                          {row.plan_name ?? `${row.pool_size} Pool`}
                        </td>
                        <td className="px-4 py-3">{row.pool_size}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.vegetation_level}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.sku}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {row.price != null ? money(row.price) : "TBD"}
                        </td>
                      </tr>
                    ))}
                    {!pricingRows.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                          No service plans configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>


      {/* LEAD DETAIL */}
      <Dialog open={!!openLead} onOpenChange={(o) => !o && setOpenLeadId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          {openLead && (
            <>
              <DialogHeader>
                <DialogTitle>{openLead.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="rounded-md border border-border p-3 text-sm">
                  <div className="font-medium">{openContact?.full_name ?? "No contact linked"}</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {openContact?.email ?? "—"} · {openContact?.phone ?? "—"}
                  </div>
                  {openContact?.address && (
                    <div className="text-muted-foreground text-xs">{openContact.address}</div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Stage</Label>
                    <Select value={openLead.stage} onValueChange={(v) => changeStage(openLead, v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={openLead.priority}
                      onValueChange={(v) => patchLead(openLead.id, { priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quoted price (internal)</Label>
                    <Input
                      type="number"
                      value={openLead.quoted_price ?? ""}
                      onChange={(e) =>
                        setLeads((ls) =>
                          ls.map((l) =>
                            l.id === openLead.id
                              ? { ...l, quoted_price: e.target.value ? Number(e.target.value) : null }
                              : l,
                          ),
                        )
                      }
                      onBlur={(e) =>
                        patchLead(openLead.id, {
                          quoted_price: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Next follow-up</Label>
                    <Input
                      type="date"
                      value={openLead.next_follow_up ?? ""}
                      onChange={(e) => patchLead(openLead.id, { next_follow_up: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Internal notes</Label>
                  <Textarea
                    rows={3}
                    defaultValue={openLead.notes ?? ""}
                    onBlur={(e) => patchLead(openLead.id, { notes: e.target.value })}
                  />
                </div>

                <LeadTimeline
                  activities={leadActivities}
                  tasks={leadTasks}
                  onAddActivity={addActivity}
                  onAddTask={addTask}
                  onToggleTask={toggleTask}
                />

                <Button variant="destructive" size="sm" onClick={() => deleteLead(openLead.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete lead
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* NEW LEAD */}
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onCreate={createLead} busy={busy} />
    </div>
  );
}

function LeadTimeline({
  activities,
  tasks,
  onAddActivity,
  onAddTask,
  onToggleTask,
}: {
  activities: Activity[];
  tasks: Task[];
  onAddActivity: (type: string, subject: string, body: string) => void;
  onAddTask: (title: string, due: string) => void;
  onToggleTask: (t: Task) => void;
}) {
  const [type, setType] = useState("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-3 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Log activity</Label>
        <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <Textarea rows={2} placeholder="Details" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button
          size="sm"
          onClick={() => {
            onAddActivity(type, subject, body);
            setSubject("");
            setBody("");
          }}
        >
          Add to timeline
        </Button>
      </div>

      <div className="rounded-md border border-border p-3 space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</Label>
        {tasks.map((t) => (
          <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={t.is_done} onCheckedChange={() => onToggleTask(t)} />
            <span className={t.is_done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
            <span className="text-xs text-muted-foreground ml-auto">{fmtDate(t.due_date)}</span>
          </label>
        ))}
        <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
          <Input placeholder="New task" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onAddTask(taskTitle, taskDue);
              setTaskTitle("");
              setTaskDue("");
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {activities.map((a) => (
          <div key={a.id} className="rounded-md bg-muted/40 p-3">
            <div className="text-sm font-medium">
              <span className="uppercase text-[10px] tracking-wider text-primary mr-2">{a.type}</span>
              {a.subject ?? "Activity"}
            </div>
            {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(a.occurred_at).toLocaleString()}
            </div>
          </div>
        ))}
        {!activities.length && (
          <p className="text-xs text-muted-foreground">No activity logged for this lead yet.</p>
        )}
      </div>
    </div>
  );
}

function NewLeadDialog({
  open,
  onOpenChange,
  onCreate,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (f: {
    name: string;
    email: string;
    phone: string;
    address: string;
    service: string;
    estimated: string;
    notes: string;
  }) => void;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service: "",
    estimated: "",
    notes: "",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["address", "Service address"],
              ["service", "Service interest"],
              ["estimated", "Estimated value"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`nl-${key}`}>{label}</Label>
              <Input
                id={`nl-${key}`}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nl-notes">Notes</Label>
          <Textarea
            id="nl-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <Button onClick={() => onCreate(form)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Create lead
        </Button>
      </DialogContent>
    </Dialog>
  );
}
