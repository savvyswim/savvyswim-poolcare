/**
 * Server-only readiness checks for QA logins.
 *
 * These answer "could this account sign in and land on its own screens?"
 * using only account metadata — no password is read, minted or returned.
 */

type AuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  banned_until?: string | null;
  last_sign_in_at?: string | null;
} | null;

export type ReadinessCheck = { check: string; passed: boolean; detail: string };

export type Readiness = {
  ok: boolean;
  summary: string;
  last_sign_in_at: string | null;
  checks: ReadinessCheck[];
};

export async function checkAccountReadiness(
  admin: { from: (t: string) => any },
  role: string,
  user: AuthUser,
): Promise<Readiness> {
  const checks: ReadinessCheck[] = [];

  if (!user) {
    return {
      ok: false,
      summary: "No login exists in this environment",
      last_sign_in_at: null,
      checks: [{ check: "login_exists", passed: false, detail: "No auth user for this email" }],
    };
  }

  checks.push({ check: "login_exists", passed: true, detail: "Auth user found" });

  const confirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  checks.push({
    check: "email_confirmed",
    passed: confirmed,
    detail: confirmed ? "Email confirmed" : "Email not confirmed — sign-in will be rejected",
  });

  const banned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
  checks.push({
    check: "not_locked",
    passed: !banned,
    detail: banned ? "Account is currently banned" : "Account is active",
  });

  if (role === "customer") {
    const { data } = await admin
      .from("ss_customers")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    checks.push({
      check: "portal_record",
      passed: Boolean(data),
      detail: data ? "Linked to a customer record" : "No customer record linked — portal is empty",
    });
    if (data) {
      checks.push({
        check: "portal_active",
        passed: data.status === "active",
        detail: `Customer status: ${data.status}`,
      });
    }
  } else {
    const { data } = await admin
      .from("ss_staff")
      .select("id, level, is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    checks.push({
      check: "staff_seat",
      passed: Boolean(data),
      detail: data ? `Staff seat: ${data.level}` : "No staff seat linked — CRM access denied",
    });
    if (data) {
      checks.push({
        check: "staff_active",
        passed: Boolean(data.is_active),
        detail: data.is_active ? "Seat is active" : "Seat is deactivated",
      });
    }
  }

  const failed = checks.filter((c) => !c.passed);
  return {
    ok: failed.length === 0,
    summary: failed.length ? failed.map((c) => c.detail).join(" · ") : "Can sign in and reach its own screens",
    last_sign_in_at: user.last_sign_in_at ?? null,
    checks,
  };
}
