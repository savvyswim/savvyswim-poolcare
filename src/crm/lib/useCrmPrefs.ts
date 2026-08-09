import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceKey } from "@/crm/lib/workspaces";

export type CrmPrefs = {
  theme: "light" | "dark";
  background: string;
  density: "comfortable" | "compact";
  sidebar_collapsed: boolean;
  last_workspace: WorkspaceKey | null;
};

export const DEFAULT_PREFS: CrmPrefs = {
  theme: "light",
  background: "canvas",
  density: "comfortable",
  sidebar_collapsed: false,
  last_workspace: null,
};

const LOCAL_KEY = "ss.crm.prefs";

function readLocal(): CrmPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<CrmPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Per-person look and feel. Saved instantly on the device and synced to the
 * account so the same person gets their workspace anywhere they sign in.
 */
export function useCrmPrefs() {
  const [prefs, setPrefs] = useState<CrmPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(readLocal());
    setReady(true);
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("ss_user_prefs")
        .select("theme, background, density, sidebar_collapsed, last_workspace")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled || !data) return;
      const next: CrmPrefs = {
        theme: (data.theme as CrmPrefs["theme"]) ?? DEFAULT_PREFS.theme,
        background: data.background ?? DEFAULT_PREFS.background,
        density: (data.density as CrmPrefs["density"]) ?? DEFAULT_PREFS.density,
        sidebar_collapsed: !!data.sidebar_collapsed,
        last_workspace: (data.last_workspace as WorkspaceKey | null) ?? null,
      };
      setPrefs(next);
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {
        /* storage disabled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<CrmPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {
        /* storage disabled */
      }
      void (async () => {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        await supabase.from("ss_user_prefs").upsert({ user_id: uid, ...next }, { onConflict: "user_id" });
      })();
      return next;
    });
  }, []);

  return { prefs, update, ready };
}
