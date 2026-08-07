import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withRetry, type RetryKind } from "@/crm/lib/retry";
import { reportCrmError } from "@/crm/lib/errorReporting";

export type SsLevel = "owner" | "office_manager" | "technician" | "contractor";

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
  isContractor: boolean;
  isCustomer: boolean;
  refresh: () => Promise<void>;
};

type IdentityState = {
  loading: boolean;
  level: SsLevel | null;
  staffId: string | null;
  staffName: string | null;
  initials: string | null;
  customerId: string | null;
};

const EMPTY: IdentityState = {
  loading: true,
  level: null,
  staffId: null,
  staffName: null,
  initials: null,
  customerId: null,
};

/**
 * Identity is read by the layout AND by most CRM pages. Without a shared
 * cache every navigation fires two more round trips and flashes a loading
 * screen, which is what makes the console feel sluggish. One in-flight
 * request per user, broadcast to every subscriber.
 */
let cacheUserId: string | null = null;
let cacheValue: IdentityState | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<(s: IdentityState) => void>();

function publish(next: IdentityState) {
  cacheValue = next;
  subscribers.forEach((fn) => fn(next));
}

export function useSavvyIdentity(): SavvyIdentity {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [state, setState] = useState<IdentityState>(
    () => (user && cacheUserId === user.id && cacheValue ? cacheValue : EMPTY),
  );

  useEffect(() => {
    subscribers.add(setState);
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const fetchIdentity = useCallback(
    async (force: boolean) => {
      if (!user) {
        cacheUserId = null;
        publish({ ...EMPTY, loading: false });
        return;
      }
      if (!force && cacheUserId === user.id && cacheValue && !cacheValue.loading) {
        setState(cacheValue);
        return;
      }
      if (!force && inflight) return inflight;

      cacheUserId = user.id;
      inflight = (async () => {
        const [{ data: staff }, { data: cust }] = await Promise.all([
          supabase.from("ss_staff").select("id, full_name, level, initials").eq("user_id", user.id).maybeSingle(),
          supabase.from("ss_customers").select("id").eq("user_id", user.id).maybeSingle(),
        ]);
        publish({
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
      })().finally(() => {
        inflight = null;
      });
      return inflight;
    },
    [user, isAdmin],
  );

  const load = useCallback(() => fetchIdentity(true).then(() => undefined), [fetchIdentity]);

  useEffect(() => {
    if (authLoading) return;
    void fetchIdentity(false);
  }, [authLoading, fetchIdentity]);


  return {
    ...state,
    loading: authLoading || state.loading,
    isOwner: state.level === "owner",
    isOffice: state.level === "owner" || state.level === "office_manager",
    isTech: state.level === "technician" || state.level === "contractor",
    isContractor: state.level === "contractor",
    isCustomer: !state.level && !!state.customerId,
    refresh: load,
  };
}

/**
 * Generic table fetch with loading + refetch.
 *
 * Rate limits and timeouts are retried with exponential backoff before the
 * page is allowed to look broken; a real error (bad query, no permission)
 * fails fast and is reported so the office can see it.
 */
export function useTable<T>(
  key: string,
  fetcher: () => Promise<T[]>,
  deps: unknown[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState<RetryKind | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withRetry(fetcher, {
        onRetry: ({ kind }) => setRetrying(kind),
      });
      setRetrying(null);
      setRows(data);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setRetrying(null);
      setError(err);
      setRows([]);
      void reportCrmError(err, { source: "useTable", table: key });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, loading, error, retrying, refetch, setRows, key };
}
