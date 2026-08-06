import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, Waves } from "lucide-react";

type LogRow = {
  id: string;
  user_email: string | null;
  area: string;
  action: string;
  record_type: string | null;
  record_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const AREAS = ["all", "auth", "crm", "store", "team", "general"] as const;

const AREA_STYLE: Record<string, string> = {
  auth: "bg-slate-100 text-slate-700",
  crm: "bg-blue-100 text-blue-700",
  store: "bg-emerald-100 text-emerald-700",
  team: "bg-amber-100 text-amber-800",
  general: "bg-muted text-muted-foreground",
};

const fmt = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AdminActivity() {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState<LogRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [area, setArea] = useState<string>("all");
  const [q, setQ] = useState("");

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
      .from("admin_audit_log")
      .select("id,user_email,area,action,record_type,record_id,details,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as LogRow[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (area === "all" || r.area === area) &&
        (!term ||
          r.action.toLowerCase().includes(term) ||
          (r.user_email ?? "").toLowerCase().includes(term) ||
          (r.record_type ?? "").toLowerCase().includes(term)),
    );
  }, [rows, area, q]);

  if (loading || (user && !isAdmin))
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Waves className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Access & activity log</p>
              <p className="text-xs text-muted-foreground">Logins and changes across CRM, store and team</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/crm">
                <ArrowLeft className="mr-2 h-4 w-4" /> CRM
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by action, user or record"
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={area === a ? "default" : "outline"}
                onClick={() => setArea(a)}
                className="capitalize"
              >
                {a}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-xs">
          {loadingData ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <ShieldCheck className="h-6 w-6" />
              No activity recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Record</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3">{r.user_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={AREA_STYLE[r.area] ?? AREA_STYLE.general}>
                        {r.area}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.record_type ? `${r.record_type}${r.record_id ? ` · ${r.record_id.slice(0, 8)}` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
