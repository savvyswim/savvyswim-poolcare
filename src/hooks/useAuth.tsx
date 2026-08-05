import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/audit";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { clearSessionClock, markActivity, startSessionClock } from "@/lib/sessionSecurity";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  refreshRole: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRole = async (uid: string | undefined) => {
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => checkRole(s?.user?.id), 0);
      if (event === "SIGNED_IN") {
        clearSessionClock();
        startSessionClock();
        markActivity();
        setTimeout(() => {
          logAdminAction({
            area: "auth",
            action: "Signed in",
            recordType: "user",
            recordId: s?.user?.id ?? null,
            details: { email: s?.user?.email ?? null },
          });
        }, 0);
      }
      if (event === "SIGNED_OUT") clearSessionClock();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) startSessionClock();
      checkRole(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshRole = async () => {
    await checkRole(user?.id);
  };

  const signOut = async () => {
    await logAdminAction({ area: "auth", action: "Signed out", recordType: "user", recordId: user?.id ?? null });
    clearSessionClock();
    await supabase.auth.signOut();
  };

  const handleExpire = useCallback(
    async (reason: "idle" | "max") => {
      await logAdminAction({
        area: "auth",
        action: reason === "idle" ? "Signed out (inactivity)" : "Signed out (session limit)",
        recordType: "user",
      });
      clearSessionClock();
      await supabase.auth.signOut();
      toast.info(
        reason === "idle"
          ? "Signed out for your security after inactivity."
          : "Session expired. Please sign in again.",
      );
    },
    [],
  );

  useIdleTimeout(!!session, handleExpire);


  return (
    <Ctx.Provider value={{ user, session, isAdmin, loading, refreshRole, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
