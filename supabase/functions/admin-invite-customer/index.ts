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

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Validate the caller's token with the auth server
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userErr || !caller) return json({ error: "Not authenticated" }, 401);

  // Only a database-verified admin may create customer logins
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "Admin access required" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 120) : "";
  const customerId = typeof body.customer_id === "string" ? body.customer_id : null;
  const origin =
    typeof body.origin === "string" && /^https?:\/\//.test(body.origin)
      ? body.origin.replace(/\/+$/, "")
      : "https://savvyswim.com";

  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address" }, 400);

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/set-password`,
    data: { full_name: fullName || undefined, role: "customer" },
  });

  if (inviteErr) {
    const msg = String(inviteErr.message ?? "");
    if (/already been registered|already registered|exists/i.test(msg)) {
      return json({ error: "That email already has a login." }, 409);
    }
    return json({ error: msg || "Could not send the invite" }, 400);
  }

  const newUserId = invited?.user?.id;

  if (customerId && newUserId) {
    const { error: linkErr } = await admin
      .from("ss_customers")
      .update({ user_id: newUserId, email })
      .eq("id", customerId);
    if (linkErr) return json({ error: `Invite sent, but linking failed: ${linkErr.message}` }, 207);
  }

  return json({ ok: true, user_id: newUserId, email });
});
