import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAdminAction } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Plus, UserPlus, Waves, X } from "lucide-react";

type AppRole = "admin" | "user" | "crm_manager" | "store_manager";

type Invitation = {
  id: string;
  email: string;
  roles: AppRole[];
  note: string | null;
  status: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

const ROLE_OPTIONS: { value: AppRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full access to every admin area" },
  { value: "crm_manager", label: "CRM manager", hint: "Leads, contacts and follow-ups" },
  { value: "store_manager", label: "Store manager", hint: "Products, orders and promo codes" },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  crm_manager: "CRM manager",
  store_manager: "Store manager",
  user: "Member",
};

const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminTeam() {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState<Invitation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [roles, setRoles] = useState<AppRole[]>(["crm_manager"]);

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
      .from("admin_invitations")
      .select("id,email,roles,note,status,accepted_at,expires_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Invitation[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const toggleRole = (r: AppRole) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const invite = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return toast.error("Enter a valid email");
    if (roles.length === 0) return toast.error("Pick at least one role");

    setBusy(true);
    const { error } = await supabase.from("admin_invitations").insert({
      email: clean,
      roles,
      note: note.trim() || null,
      invited_by: user!.id,
    });
    setBusy(false);

    if (error) {
      if (error.code === "23505") return toast.error("There is already a pending invite for that email");
      return toast.error(error.message);
    }
    logAdminAction({ area: "team", action: "Invitation sent", recordType: "invitation", details: { email: clean, roles } });
    toast.success(`Invitation created for ${clean}`);
    setEmail("");
    setNote("");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("admin_invitations").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    logAdminAction({ area: "team", action: "Invitation revoked", recordType: "invitation", recordId: id });
    toast.success("Invitation revoked");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("admin_invitations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const copySignupLink = async (inviteEmail: string) => {
    const url = `${window.location.origin}/auth?invite=${encodeURIComponent(inviteEmail)}`;
    await navigator.clipboard.writeText(url);
    toast.success("Signup link copied — send it to your teammate");
  };

  if (loading || (user && !isAdmin)) {
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
              <h1 className="font-semibold leading-tight tracking-tight">Team &amp; access</h1>
              <p className="text-xs crm-sub">Invite teammates and assign roles</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-white/85 hover:text-white hover:bg-white/10">
            <Link to="/admin/crm">
              <ArrowLeft className="h-4 w-4 mr-1" /> CRM
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs h-fit">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Invite a teammate</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Roles are granted automatically the moment they create an account with this email.
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@savvyswim.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={roles.includes(r.value)}
                    onCheckedChange={() => toggleRole(r.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-note">Internal note (optional)</Label>
              <Textarea
                id="invite-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Service tech covering Plano route"
              />
            </div>

            <Button className="w-full" onClick={invite} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Plus className="h-4 w-4 mr-1" /> Send invitation</>)}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Invitations</h2>
            <p className="text-sm text-muted-foreground">
              Pending invites apply on signup. Revoke one to cancel it before it is used.
            </p>
          </div>

          {loadingData ? (
            <div className="p-10 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No invitations yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((inv) => (
                <li key={inv.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{inv.email}</span>
                      <Badge
                        variant={
                          inv.status === "accepted" ? "default" : inv.status === "revoked" ? "destructive" : "secondary"
                        }
                      >
                        {inv.status}
                      </Badge>
                      {inv.roles.map((r) => (
                        <Badge key={r} variant="outline">
                          {ROLE_LABEL[r] ?? r}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Invited {fmt(inv.created_at)}
                      {inv.status === "pending" && ` · expires ${fmt(inv.expires_at)}`}
                      {inv.status === "accepted" && ` · joined ${fmt(inv.accepted_at)}`}
                      {inv.note ? ` · ${inv.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inv.status === "pending" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => copySignupLink(inv.email)}>
                          <Copy className="h-4 w-4 mr-1" /> Copy link
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}>
                          Revoke
                        </Button>
                      </>
                    )}
                    {inv.status !== "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => remove(inv.id)} aria-label="Remove invitation">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
