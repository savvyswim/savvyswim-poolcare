import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userErr || !caller) return json({ error: "Not authenticated" }, 401);

  // Owners, office managers, or verified database admins may issue staff logins.
  const [{ data: roleRow }, { data: staffRow }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle(),
    admin.from("ss_staff").select("level").eq("user_id", caller.id).maybeSingle(),
  ]);
  const level = staffRow?.level as string | undefined;
  if (!roleRow && level !== "owner" && level !== "office_manager") {
    return json({ error: "Office or owner access required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const staffId = typeof body.staff_id === "string" ? body.staff_id : "";
  const origin =
    typeof body.origin === "string" && /^https?:\/\//.test(body.origin)
      ? body.origin.replace(/\/+$/, "")
      : "https://savvyswim.com";

  if (!staffId) return json({ error: "Missing team member" }, 400);

  const { data: staff } = await admin
    .from("ss_staff")
    .select("id, full_name, email, level, user_id")
    .eq("id", staffId)
    .maybeSingle();

  if (!staff) return json({ error: "Team member not found" }, 404);
  if (staff.user_id) return json({ error: "That team member already has a login." }, 409);

  const email = String(staff.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ error: "Add a valid email to that team member first" }, 400);

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/set-password`,
    data: { full_name: staff.full_name, role: staff.level },
  });

  if (inviteErr) {
    const msg = String(inviteErr.message ?? "");
    if (/already been registered|already registered|exists/i.test(msg)) {
      return json({ error: "That email already has a login." }, 409);
    }
    return json({ error: msg || "Could not send the invite" }, 400);
  }

  const newUserId = invited?.user?.id;
  if (newUserId) {
    const { error: linkErr } = await admin
      .from("ss_staff")
      .update({ user_id: newUserId })
      .eq("id", staff.id);
    if (linkErr) return json({ error: `Invite sent, but linking failed: ${linkErr.message}` }, 207);
  }

  return json({ ok: true, email, user_id: newUserId });
});
