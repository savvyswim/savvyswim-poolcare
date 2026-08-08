/**
 * Server-only helpers for rotating QA / demo credentials.
 *
 * Rules this module enforces:
 *  - passwords are minted here with a CSPRNG, never chosen by a caller,
 *  - they are returned exactly once to the owner who asked for the rotation,
 *  - nothing password-shaped is ever written to the database or the audit log.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const SYMBOLS = "!@#$%^&*-_=+";

/** 20+ chars of CSPRNG entropy, plus a symbol/digit so it passes any policy. */
export function mintPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const sym = SYMBOLS[crypto.getRandomValues(new Uint8Array(1))[0]! % SYMBOLS.length];
  return `Swim${sym}${body}`;
}

/** Never log or store a secret — this is what goes in the audit trail instead. */
export async function fingerprint(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest).slice(0, 6), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

type AdminClient = {
  auth: {
    admin: {
      listUsers: (opts: { page: number; perPage: number }) => Promise<any>;
      updateUserById: (id: string, attrs: Record<string, unknown>) => Promise<any>;
      generateLink: (opts: Record<string, unknown>) => Promise<any>;
    };
  };
};

/** Looks up an auth user by email without exposing the admin API to callers. */
export async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const needle = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users: { id: string; email?: string | null }[] = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === needle);
    if (hit) return hit;
    if (users.length < 200) break;
  }
  return null;
}

/** Environment label derived from the request origin, so prod and preview stay separate. */
export function environmentFromOrigin(origin?: string | null): "production" | "preview" {
  if (!origin) return "preview";
  try {
    const host = new URL(origin).hostname;
    const isPreview = host.includes("-dev.") || host.includes("id-preview--") || host === "localhost";
    return isPreview ? "preview" : "production";
  } catch {
    return "preview";
  }
}
