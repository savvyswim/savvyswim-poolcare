import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Waves } from "lucide-react";

export default function SetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set. You're signed in.");
      nav("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not set your password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <Link to="/" className="flex items-center gap-2 justify-center text-foreground">
          <Waves className="h-5 w-5 text-amber-brand" />
          <span className="font-semibold">Savvy Swim</span>
        </Link>
        <form onSubmit={submit} className="space-y-4 border border-hairline rounded-2xl p-6 bg-card">
          <h1 className="text-xl font-semibold">Choose your password</h1>
          <p className="text-xs text-muted-foreground">
            Welcome aboard. Pick a password to finish setting up your Savvy Swim account.
          </p>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !ready}>
            {busy ? "Saving…" : ready ? "Save password" : "Verifying your link…"}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center">
          Link expired? Ask us to resend your invite.
        </p>
      </div>
    </div>
  );
}
