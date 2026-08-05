import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SsLevel = "owner" | "office_manager" | "technician";

export type SavvyIdentity = {
  loading: boolean;
  level: SsLevel | null;
  staffId: string | null;
  staffName: string | null;
  initials: string | null;
  customerId: string | null;
  isOwner: boolean;
  isOffice: boolean;
  isTech: boolean;
  isCustomer: boolean;
  refresh: () => Promise<void>;
};

export function useSavvyIdentity(): SavvyIdentity {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    loading: true,
    level: null as SsLevel | null,
    staffId: null as string | null,
    staffName: null as string | null,
    initials: null as string | null,
    customerId: null as string | null,
  });

  const load = useCallback(async () => {
    if (!user) {
      setState({ loading: false, level: null, staffId: null, staffName: null, initials: null, customerId: null });
      return;
    }
    const [{ data: staff }, { data: cust }] = await Promise.all([
      supabase.from("ss_staff").select("id, full_name, level, initials").eq("user_id", user.id).maybeSingle(),
      supabase.from("ss_customers").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    setState({
      loading: false,
      // Legacy admins may predate the ss_staff roster. Treat their verified
      // database admin role as owner access so the admin portal never appears empty.
      level: (staff?.level as SsLevel) ?? (isAdmin ? "owner" : null),
      staffId: staff?.id ?? null,
      staffName: staff?.full_name ?? (isAdmin ? user.email ?? "Administrator" : null),
      initials:
        staff?.initials ||
        (staff?.full_name ?? "").split(" ").map((p) => p[0]).join("").slice(0, 3) ||
        null,
      customerId: cust?.id ?? null,
    });
  }, [user, isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  return {
    ...state,
    loading: authLoading || state.loading,
    isOwner: state.level === "owner",
    isOffice: state.level === "owner" || state.level === "office_manager",
    isTech: state.level === "technician",
    isCustomer: !state.level && !!state.customerId,
    refresh: load,
  };
}

/** Generic table fetch with loading + refetch. */
export function useTable<T>(
  key: string,
  fetcher: () => Promise<T[]>,
  deps: unknown[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetcher());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, loading, refetch, setRows, key };
}
