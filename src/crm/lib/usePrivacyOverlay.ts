import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PRIVACY_SETTINGS_KEY = "privacy_overlay";

export type PrivacyOverlayConfig = {
  /** Master switch — when false, no blur/capture guard runs for anyone. */
  enabled: boolean;
};

export const DEFAULT_PRIVACY_CONFIG: PrivacyOverlayConfig = { enabled: true };

async function fetchConfig(): Promise<PrivacyOverlayConfig> {
  const { data } = await supabase
    .from("ss_settings")
    .select("value")
    .eq("key", PRIVACY_SETTINGS_KEY)
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<PrivacyOverlayConfig>;
  return { ...DEFAULT_PRIVACY_CONFIG, ...value };
}

/**
 * Reads the global privacy-overlay switch. Re-checks on window focus and on a
 * slow interval so an owner can flip it live for troubleshooting — no redeploy.
 */
export function usePrivacyOverlayConfig() {
  const [config, setConfig] = useState<PrivacyOverlayConfig>(DEFAULT_PRIVACY_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setConfig(await fetchConfig());
    } catch {
      /* keep last known value */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const t = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(t);
    };
  }, [refresh]);

  return { config, loading, refresh };
}

export async function savePrivacyOverlayConfig(next: PrivacyOverlayConfig) {
  const { error } = await supabase
    .from("ss_settings")
    .upsert({ key: PRIVACY_SETTINGS_KEY, value: next as never }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
