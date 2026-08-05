import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Waves } from "lucide-react";
import { isSharedDevice, setSharedDevice } from "@/lib/sessionSecurity";

export default function Auth() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const loc = useLocation();
  const dest = ((loc.state as { from?: string } | null)?.from) || "/admin/crm";
  const inviteEmail = new URLSearchParams(window.location.search).get("invite") ?? "";
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(() => isSharedDevice());

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
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

      </div>
    </div>
  );
}
