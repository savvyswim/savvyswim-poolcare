import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Waves } from "lucide-react";
import Seo from "@/components/Seo";
import { isSharedDevice, setSharedDevice } from "@/lib/sessionSecurity";

export default function Auth() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const loc = useLocation();
  const dest = ((loc.state as { from?: string } | null)?.from) || "/admin/crm";
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  // Browser-only state is read after hydration so SSR and client markup match.
  useEffect(() => {
    setMounted(true);
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (invite) setEmail((prev) => prev || invite);
    setShared(isSharedDevice());
  }, []);

  useEffect(() => {
    if (!loading && user) nav(dest, { replace: true });
  }, [user, loading, nav]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav(dest, { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Check your email for a reset link.");
  };

  // ---- Preview-only quick access -------------------------------------------
  // Only rendered on localhost / the Lovable preview host, never on the live
  // site, so it can't be used as a shortcut into production.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isPreview =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovableproject.com") ||
    (host.endsWith(".lovable.app") && host.startsWith("id-preview"));
  const OWNER_EMAIL = "marcus@santanariveragroup.com";

  const magicLink = async (target: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: target,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}${dest}`,
        },
      });
      if (error) throw error;
      toast.success(`Sign-in link sent to ${target} — open it in this browser.`);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send the sign-in link");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Seo
        title="Sign In | Savvy Swim"
        description="Secure sign-in for Savvy Swim customers and team members to view pool service reports, billing, and route details."
        path="/auth"
        noindex
      />
      <div className="w-full max-w-sm space-y-6">
        <Link to="/" className="flex items-center gap-2 justify-center text-foreground">
          <Waves className="h-5 w-5 text-amber-brand" />
          <span className="font-semibold">Savvy Swim — Sign in</span>
        </Link>
        <form onSubmit={submit} className="space-y-4 border border-hairline rounded-2xl p-6 bg-card">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-current"
              checked={shared}
              onChange={(e) => {
                setShared(e.target.checked);
                setSharedDevice(e.target.checked);
              }}
            />
            <span>
              This is a shared or public device — sign me out after 10 minutes idle and when I close
              the tab.
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={resetPassword}
          >
            Forgot your password?
          </button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center">
          Accounts are created by Savvy Swim. Check your email for your invite link.
        </p>

        {isPreview && (
          <div className="border border-dashed border-hairline rounded-2xl p-4 space-y-3 bg-muted/30">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Preview only — owner quick access
            </div>
            <p className="text-xs text-muted-foreground">
              Signs you in as <span className="font-medium text-foreground">{OWNER_EMAIL}</span>{" "}
              (admin + owner). This panel never appears on savvyswim.com.
            </p>
            <div className="grid gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setEmail(OWNER_EMAIL);
                  setSharedDevice(false);
                  setShared(false);
                  toast.info("Owner email filled in — enter your password and sign in.");
                }}
              >
                Fill in owner email
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => magicLink(OWNER_EMAIL)}
              >
                Email me a one-click owner sign-in link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                disabled={busy}
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, {
                    redirectTo: `${window.location.origin}/set-password`,
                  });
                  if (error) toast.error(error.message);
                  else toast.success("Password reset link sent to the owner address.");
                }}
              >
                Forgot the owner password? Send a reset link
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              After signing in you land on the admin portal — walk the sidebar to verify each module.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
