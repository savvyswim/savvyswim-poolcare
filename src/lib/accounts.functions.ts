import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailSchema = z.string().trim().toLowerCase().email().max(200);

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .optional();

/** Office managers, owners and platform admins may issue logins. */
async function assertOffice(supabase: any) {
  const [{ data: isOffice }, { data: roleRow }] = await Promise.all([
    supabase.rpc("ss_is_office"),
    supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle(),
  ]);
  if (!isOffice && !roleRow) {
    throw new Error("Office or owner access required to create logins");
  }
}

function makeTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return `Swim-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/**
 * Creates (or reuses) the auth login behind a customer record and links it to
 * ss_customers.user_id, so the portal only ever shows that customer's property.
 */
export const createCustomerLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        customer_id: z.string().uuid(),
        email: emailSchema.optional(),
        mode: z.enum(["invite", "password"]).default("invite"),
        password: passwordSchema,
        origin: z.string().url().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: customer, error: custErr } = await supabaseAdmin
      .from("ss_customers")
      .select("id, full_name, email, user_id")
      .eq("id", data.customer_id)
      .maybeSingle();
    if (custErr) throw new Error(custErr.message);
    if (!customer) throw new Error("Customer not found");
    if (customer.user_id) throw new Error("This customer already has a login");

    const email = (data.email ?? customer.email ?? "").trim().toLowerCase();
    if (!emailSchema.safeParse(email).success) {
      throw new Error("Add a valid email address for this customer first");
    }

    const origin = data.origin ? new URL(data.origin).origin : "https://savvyswim.com";
    let userId: string | undefined;
    let tempPassword: string | undefined;

    if (data.mode === "password") {
      tempPassword = data.password ?? makeTempPassword();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: customer.full_name, role: "customer" },
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id;
    } else {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/set-password`,
        data: { full_name: customer.full_name, role: "customer" },
      });
      if (error) {
        throw new Error(
          /registered|exists/i.test(error.message)
            ? "That email already has a login — link it from the customer record instead."
            : error.message,
        );
      }
      userId = invited.user?.id;
    }

    if (!userId) throw new Error("Login could not be created");

    const { error: linkErr } = await supabaseAdmin
      .from("ss_customers")
      .update({ user_id: userId, email })
      .eq("id", customer.id);
    if (linkErr) throw new Error(`Login created, but linking failed: ${linkErr.message}`);

    return { ok: true, email, user_id: userId, password: tempPassword ?? null, mode: data.mode };
  });

/**
 * Creates (or reuses) the auth login behind a staff record and links it to
 * ss_staff.user_id, which drives every CRM permission level.
 */
export const createStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        staff_id: z.string().uuid(),
        email: emailSchema.optional(),
        mode: z.enum(["invite", "password"]).default("invite"),
        password: passwordSchema,
        origin: z.string().url().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("ss_staff")
      .select("id, full_name, email, level, user_id")
      .eq("id", data.staff_id)
      .maybeSingle();
    if (staffErr) throw new Error(staffErr.message);
    if (!staff) throw new Error("Team member not found");
    if (staff.user_id) throw new Error("This team member already has a login");

    const email = (data.email ?? staff.email ?? "").trim().toLowerCase();
    if (!emailSchema.safeParse(email).success) {
      throw new Error("Add a valid email address for this team member first");
    }

    const origin = data.origin ? new URL(data.origin).origin : "https://savvyswim.com";
    let userId: string | undefined;
    let tempPassword: string | undefined;

    if (data.mode === "password") {
      tempPassword = data.password ?? makeTempPassword();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: staff.full_name, role: "staff", level: staff.level },
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id;
    } else {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/set-password`,
        data: { full_name: staff.full_name, role: "staff", level: staff.level },
      });
      if (error) {
        throw new Error(
          /registered|exists/i.test(error.message)
            ? "That email already has a login — link it from the team member record instead."
            : error.message,
        );
      }
      userId = invited.user?.id;
    }

    if (!userId) throw new Error("Login could not be created");

    const { error: linkErr } = await supabaseAdmin
      .from("ss_staff")
      .update({ user_id: userId, email })
      .eq("id", staff.id);
    if (linkErr) throw new Error(`Login created, but linking failed: ${linkErr.message}`);

    return { ok: true, email, user_id: userId, password: tempPassword ?? null, mode: data.mode };
  });

/**
 * Self-heals the "No staff access" dead end: if the signed-in email matches an
 * active roster row that has no login attached yet, link them together.
 */
export const claimStaffSeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String((context.claims as any)?.email ?? "").trim().toLowerCase();
    const userId = context.userId as string;
    if (!email) return { ok: false as const, reason: "No email on this account" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mine } = await supabaseAdmin
      .from("ss_staff")
      .select("id, level")
      .eq("user_id", userId)
      .maybeSingle();
    if (mine) return { ok: true as const, level: mine.level };

    const { data: staff, error } = await supabaseAdmin
      .from("ss_staff")
      .select("id, level, user_id, is_active")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!staff) return { ok: false as const, reason: "No roster entry matches this email" };
    if (!staff.is_active) return { ok: false as const, reason: "That roster entry is inactive" };
    if (staff.user_id && staff.user_id !== userId) {
      return { ok: false as const, reason: "That roster entry is linked to another login" };
    }

    const { error: linkErr } = await supabaseAdmin
      .from("ss_staff")
      .update({ user_id: userId })
      .eq("id", staff.id);
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true as const, level: staff.level };
  });
