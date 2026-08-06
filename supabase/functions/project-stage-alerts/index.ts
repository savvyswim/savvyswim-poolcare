import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Task = {
  id: string;
  project_id: string;
  stage_id: string;
  kind: string;
  label: string;
  doc_folder: string | null;
  is_required: boolean;
  is_done: boolean;
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Service-role (scheduled digest) or an active owner / office manager. */
async function isAuthorized(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === SERVICE_ROLE_KEY) return true;
  const { data: userData } = await admin.auth.getUser(token);
  if (!userData?.user) return false;
  const { data: staff } = await admin
    .from("ss_staff")
    .select("level, is_active")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  return !!staff?.is_active && ["owner", "office_manager"].includes(staff.level);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** A required item counts as satisfied when ticked, or when its doc folder has a file. */
function isSatisfied(t: Task, folders: Set<string>) {
  return t.is_done || (t.kind === "document" && !!t.doc_folder && folders.has(t.doc_folder));
}

async function recipientsFor(project: { lead_staff_id: string | null }) {
  const { data: staff } = await admin
    .from("ss_staff")
    .select("id, full_name, email, level, is_active")
    .eq("is_active", true);
  const list = staff ?? [];
  const owners = list.filter((s) => s.level === "owner");
  const lead = project.lead_staff_id ? list.find((s) => s.id === project.lead_staff_id) : null;
  const picked = [...owners, ...(lead ? [lead] : [])];
  const seen = new Set<string>();
  return picked.filter((s) => s.email && !seen.has(s.email) && seen.add(s.email));
}

async function alreadySent(projectId: string, alertKey: string, withinHours: number) {
  const since = new Date(Date.now() - withinHours * 3600_000).toISOString();
  const { data } = await admin
    .from("ss_project_alert_log")
    .select("id")
    .eq("project_id", projectId)
    .eq("alert_key", alertKey)
    .gte("created_at", since)
    .limit(1);
  return !!data?.length;
}

async function raise(opts: {
  projectId: string;
  stageId: string | null;
  customerId: string | null;
  alertKey: string;
  priority: "HIGH" | "MED";
  title: string;
  body: string;
  recipients: { email: string | null; full_name: string }[];
}) {
  await admin.from("ss_alerts").insert({
    customer_id: opts.customerId,
    priority: opts.priority,
    title: opts.title,
    body: opts.body,
  });

  const emails = opts.recipients.map((r) => r.email!).filter(Boolean);
  await admin.from("ss_project_alert_log").insert({
    project_id: opts.projectId,
    stage_id: opts.stageId,
    alert_key: opts.alertKey,
    channel: "in_app",
    recipients: emails,
  });

  // Email delivery is enabled once a verified sender domain exists for this project.
  console.log(`[stage-alerts] ${opts.title} -> ${emails.join(", ") || "no recipients"}`);
}

async function scanProject(projectId: string, stageFilter?: string, force = false) {
  const [{ data: project }, { data: stages }, { data: tasks }, { data: files }] = await Promise.all([
    admin.from("ss_projects").select("id, title, customer_id, lead_staff_id, status").eq("id", projectId).maybeSingle(),
    admin.from("ss_project_stages").select("id, name, status, sort_order, end_date").eq("project_id", projectId).order("sort_order"),
    admin.from("ss_project_stage_tasks").select("*").eq("project_id", projectId),
    admin.from("ss_project_files").select("doc_folder").eq("project_id", projectId),
  ]);
  if (!project) return { project: null, alerts: 0 };

  const folders = new Set((files ?? []).map((f) => f.doc_folder as string));
  const recipients = await recipientsFor(project);
  const today = new Date().toISOString().slice(0, 10);
  let raised = 0;

  for (const stage of stages ?? []) {
    if (stageFilter && stage.id !== stageFilter) continue;
    const list = ((tasks ?? []) as Task[]).filter((t) => t.stage_id === stage.id);
    const missing = list.filter((t) => t.is_required && !isSatisfied(t, folders));
    if (!missing.length) continue;

    const overdue = !!stage.end_date && stage.end_date < today;
    const active = stage.status === "in_progress" || stage.status === "complete";
    if (!stageFilter && !force && !active && !overdue) continue;

    const alertKey = `stage-missing:${stage.id}:${missing.length}`;
    if (await alreadySent(projectId, alertKey, stageFilter || force ? 1 : 20)) continue;

    const docs = missing.filter((m) => m.kind === "document");
    const checks = missing.filter((m) => m.kind !== "document");
    const lines = [
      `${project.title} — ${stage.name}`,
      checks.length ? `Checklist missing (${checks.length}): ${checks.map((c) => c.label).join(", ")}` : "",
      docs.length ? `Documents missing (${docs.length}): ${docs.map((d) => d.label).join(", ")}` : "",
      stage.status === "complete" ? "This stage was marked complete with items still open." : "",
      overdue ? `Stage was due ${stage.end_date}.` : "",
    ].filter(Boolean);

    await raise({
      projectId,
      stageId: stage.id,
      customerId: project.customer_id,
      alertKey,
      priority: stage.status === "complete" || overdue ? "HIGH" : "MED",
      title: `${missing.length} item${missing.length > 1 ? "s" : ""} missing — ${stage.name}`,
      body: lines.join("\n"),
      recipients,
    });
    raised++;
  }

  return { project, alerts: raised };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!(await isAuthorized(req))) return json({ error: "Unauthorized" }, 401);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = body.mode === "stage" ? "stage" : "digest";

    if (mode === "stage") {
      if (typeof body.project_id !== "string") {
        return json({ error: "project_id is required" }, 400);
      }
      const stageId = typeof body.stage_id === "string" ? body.stage_id : undefined;
      const res = await scanProject(body.project_id, stageId, !stageId);
      return json({ ok: true, alerts: res.alerts });
    }

    const { data: projects } = await admin
      .from("ss_projects")
      .select("id")
      .not("status", "in", '("complete","cancelled","lost")');

    let total = 0;
    for (const p of projects ?? []) {
      const res = await scanProject(p.id);
      total += res.alerts;
    }
    return json({ ok: true, projects: projects?.length ?? 0, alerts: total });
  } catch (e) {
    console.error("[stage-alerts] failed", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
