import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Owner-only rotation of QA / demo logins.
 *
 * The generated password is returned once to the calling owner and is never
 * persisted, logged, emailed to the chat, or committed to the repo.
 */
export const listTestAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertOwner } = await import("@/lib/test-credentials.guard.server");
    await assertOwner(context.supabase);
    const { data, error } = await context.supabase
      .from("ss_test_accounts")
      .select("*")
      .order("environment")
      .order("label");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTestAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email().max(200),
        role: z.enum(["owner", "office", "tech", "customer"]),
        environment: z.enum(["preview", "production"]),
        notes: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/test-credentials.guard.server");
    await assertOwner(context.supabase);
    const { id, ...rest } = data;
    const row = { ...rest, notes: data.notes ?? null, ...(id ? { id } : {}) };
    const { error } = await context.supabase
      .from("ss_test_accounts")
      .upsert(row, { onConflict: "email,environment" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeTestAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/test-credentials.guard.server");
    await assertOwner(context.supabase);
    const { error } = await context.supabase.from("ss_test_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Rotates one registered test login.
 *  - mode "reveal": mints a new password and shows it once in the CRM.
 *  - mode "link":   mails a one-time recovery link, so no secret is displayed.
 */
export const rotateTestCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        mode: z.enum(["reveal", "link"]).default("reveal"),
        origin: z.string().url().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/test-credentials.guard.server");
    await assertOwner(context.supabase);

    const {
      mintPassword,
      fingerprint,
      findAuthUserByEmail,
      environmentFromOrigin,
    } = await import("@/lib/test-credentials.server");
    const { recordAudit } = await import("@/lib/audit.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("ss_test_accounts")
      .select("id, label, email, role, environment, rotation_count")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That test account is not registered");

    const callerEnv = environmentFromOrigin(data.origin);
    if (row.environment !== callerEnv) {
      throw new Error(
        `This account belongs to the ${row.environment} environment — rotate it from ${row.environment}.`,
      );
    }

    const user = await findAuthUserByEmail(supabaseAdmin as never, row.email);
    if (!user) throw new Error(`No login exists for ${row.email} in this environment`);

    let password: string | null = null;
    let actionLink: string | null = null;

    if (data.mode === "reveal") {
      password = mintPassword();
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
      });
      if (updErr) throw new Error(updErr.message);
    } else {
      const origin = data.origin ? new URL(data.origin).origin : "https://savvyswim.com";
      const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: row.email,
        options: { redirectTo: `${origin}/set-password` },
      });
      if (linkErr) throw new Error(linkErr.message);
      actionLink = link?.properties?.action_link ?? null;
    }

    await supabaseAdmin
      .from("ss_test_accounts")
      .update({
        last_rotated_at: new Date().toISOString(),
        last_rotated_by: context.userId as string,
        rotation_count: (row.rotation_count ?? 0) + 1,
      })
      .eq("id", row.id);

    await recordAudit({
      action: "test_credential.rotate",
      actorKind: "user",
      actorUserId: context.userId as string,
      actorLabel: String((context.claims as any)?.email ?? "owner"),
      subjectTable: "ss_test_accounts",
      subjectId: row.id,
      success: true,
      outcome: `${row.label} rotated in ${row.environment} (${data.mode})`,
      details: {
        environment: row.environment,
        mode: data.mode,
        // fingerprint only — the secret itself is never stored
        secret_fingerprint: password ? await fingerprint(password) : null,
      },
    });

    return {
      ok: true as const,
      email: row.email,
      environment: row.environment,
      password,
      action_link: actionLink,
    };
  });

/**
 * Owner-only self-check: verifies each registered login for the caller's
 * environment is actually usable (auth user exists, confirmed, not banned, and
 * wired to the right staff/customer record). No secret is read or returned.
 */
export const selfCheckTestAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ origin: z.string().url().max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/test-credentials.guard.server");
    await assertOwner(context.supabase);

    const { environmentFromOrigin, findAuthUserByEmail } = await import(
      "@/lib/test-credentials.server"
    );
    const { checkAccountReadiness } = await import("@/lib/test-credentials.check.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const environment = environmentFromOrigin(data.origin);
    const { data: rows, error } = await supabaseAdmin
      .from("ss_test_accounts")
      .select("id, label, email, role, environment")
      .eq("environment", environment)
      .order("label");
    if (error) throw new Error(error.message);

    const results = [];
    for (const row of rows ?? []) {
      const user = await findAuthUserByEmail(supabaseAdmin as never, row.email);
      results.push({
        id: row.id,
        label: row.label,
        email: row.email,
        role: row.role,
        ...(await checkAccountReadiness(supabaseAdmin as never, row.role, user)),
      });
    }

    return {
      environment,
      checked_at: new Date().toISOString(),
      passed: results.every((r) => r.ok),
      results,
    };
  });
