import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OauthAuthClient = { name?: string | null };
type OauthAuthDetails = {
  client?: OauthAuthClient | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OauthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OauthAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OauthAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OauthAuthDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OauthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? (s['authorization_id'] as string) : "",
  }),
  beforeLoad: async ({ search }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return null;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <p className="text-sm text-[#54646E]">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F4EFE3] flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-[#D9CDB8] bg-white p-8">
        <div className="mb-6 h-2 w-full bg-[repeating-linear-gradient(90deg,#8E1F2C_0_24px,#FFF6EE_24px_42px)]" />
        <h1 className="font-[Anton,sans-serif] text-2xl uppercase tracking-wide text-[#8E1F2C]">
          Savvy Swim
        </h1>
        {children}
      </div>
    </main>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <p className="mt-3 text-sm text-[#54646E]">Sign in to approve this connection.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-[#C0303B]">{error}</p> : null}
      <form onSubmit={signIn} className="mt-5 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border border-[#D9CDB8] bg-[#FAF6EC] px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-[#D9CDB8] bg-[#FAF6EC] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#8E1F2C] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!details) {
    return (
      <Shell>
        <SignIn />
      </Shell>
    );
  }

  const clientName = details.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <h2 className="mt-3 text-lg font-bold text-[#1C2A33]">Connect {clientName} to your account</h2>
      <p className="mt-2 text-sm text-[#54646E]">
        This lets {clientName} read and update Savvy Swim leads as you. You can disconnect at any time.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-[#C0303B]">{error}</p> : null}
      <div className="mt-6 flex gap-3">
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 bg-[#8E1F2C] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 border border-[#D9CDB8] bg-[#FAF6EC] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[#1C2A33] disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </Shell>
  );
}
