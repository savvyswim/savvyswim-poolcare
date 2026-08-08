import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ChemHistoryChart, { type ChemRow } from "@/components/ChemHistoryChart";

/** CRM chemistry trends for one customer's pool. */
export default function ChemHistory({ customerId }: { customerId: string }) {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ChemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("ss_visits")
      .select("scheduled_date,readings")
      .eq("customer_id", customerId)
      .gte("scheduled_date", since)
      .order("scheduled_date");
    setRows(
      ((data ?? []) as { scheduled_date: string; readings: Record<string, number> }[])
        .filter((r) => r.readings && Object.keys(r.readings).length)
        .map((r) => ({ date: r.scheduled_date, readings: r.readings })),
    );
    setLoading(false);
  }, [customerId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return <ChemHistoryChart rows={rows} days={days} onDays={setDays} loading={loading} />;
}
