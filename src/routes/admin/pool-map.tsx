import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { crmPoolMap } from "@/lib/area-map.functions";

export const Route = createFileRoute("/admin/pool-map")({
  component: PoolMapPage,
  head: () => ({
    meta: [
      { title: "Pool Map · Savvy Swim Admin" },
      {
        name: "description",
        content:
          "Internal Savvy Swim map of every active pool on route, with its service city and route day.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Pool Map · Savvy Swim Admin" },
      { property: "og:description", content: "Active pools on route, plotted on one map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-24 w-full max-w-sm border border-foreground/15 bg-background p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) toast.error(error.message);
        else onDone();
      }}
    >
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">Admin sign in</h1>
      <p className="mt-2 text-sm text-foreground/60">Office and owner accounts only.</p>
      <input
        className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="email"
        autoComplete="email"
        placeholder="you@savvyswim.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="mt-3 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button
        className="mt-5 w-full bg-[#8E1F2C] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[#F4EFE3] disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

function PoolMapPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const loadMap = useServerFn(crmPoolMap);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["admin-pool-map"],
    queryFn: () => loadMap({ data: { limit: 40 } }),
    enabled: authed === true,
  });

  if (authed === null) return <div className="p-10 text-sm text-foreground/60">Loading…</div>;
  if (!authed) return <SignIn onDone={() => setAuthed(true)} />;

  const err = query.error as Error | null;
  const data = query.data;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E1F2C]">Savvy Swim · Admin</p>
          <h1 className="font-display text-4xl uppercase tracking-[0.04em]">Pool map</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Active pools on route. Staff only. Never shown on the public site.
          </p>
        </div>
        <Link
          to="/admin/leads"
          className="border border-foreground/25 px-4 py-2 text-xs uppercase tracking-[0.14em] hover:text-[#8E1F2C]"
        >
          Free inspections
        </Link>
      </header>

      {err ? (
        <p className="mt-8 border border-[#8E1F2C]/40 p-5 text-sm text-[#8E1F2C]">{err.message}</p>
      ) : null}

      {query.isLoading ? (
        <p className="mt-8 text-sm text-foreground/55">Loading pools…</p>
      ) : data ? (
        <>
          {data.image ? (
            <img
              src={data.image}
              alt="Map of active Savvy Swim pools on route"
              className="mt-8 w-full border border-foreground/15"
              loading="lazy"
            />
          ) : (
            <p className="mt-8 border border-foreground/15 p-5 text-sm text-foreground/55">
              Map image unavailable right now. The pool list below is still current.
            </p>
          )}

          <div className="mt-8 overflow-x-auto border border-foreground/15">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-foreground/15 text-left text-[11px] uppercase tracking-[0.14em] text-foreground/50">
                  <th className="px-4 py-3">Pool</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Route day</th>
                </tr>
              </thead>
              <tbody>
                {data.pins.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-foreground/55" colSpan={4}>
                      No active pools with an address yet.
                    </td>
                  </tr>
                ) : (
                  data.pins.map((p) => (
                    <tr key={p.id} className="border-b border-foreground/10">
                      <td className="px-4 py-3">{p.label}</td>
                      <td className="px-4 py-3 text-foreground/70">{p.address}</td>
                      <td className="px-4 py-3">{p.city ?? ", "}</td>
                      <td className="px-4 py-3 text-foreground/70">{p.routeDay ?? ", "}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
