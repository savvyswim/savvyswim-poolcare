import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Savvy Swim" },
      { name: "description", content: "Choose a new password for your Savvy Swim account." },
      { property: "og:title", content: "Set a new password | Savvy Swim" },
      { property: "og:description", content: "Choose a new password for your Savvy Swim account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <form
      className="mx-auto mt-24 w-full max-w-sm border border-foreground/15 bg-background p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) return toast.error("Use at least 8 characters");
        setBusy(true);
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (error) return toast.error(error.message);
        toast.success("Password saved");
        navigate({ to: "/office" });
      }}
    >
      <h1 className="font-display text-2xl uppercase tracking-[0.08em]">New password</h1>
      <p className="mt-2 text-sm text-foreground/60">Works on savvyswim.com and savvyswim.app.</p>
      <input
        className="mt-6 w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        type="password"
        autoComplete="new-password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button
        className="mt-5 w-full bg-primary px-4 py-2 text-sm uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
