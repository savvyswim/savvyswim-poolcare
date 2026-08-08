import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ChemHistoryChart, { type ChemRow } from "@/components/ChemHistoryChart";

/** Customer-portal chemistry trends, scoped by the signed-in customer. */
export default function PortalChemHistory() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ChemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("ss_my_chem_history" as never, { _days: days } as never);
    const list = (data as unknown as { visit_date: string; readings: Record<string, number> }[]) ?? [];
    setRows(list.map((r) => ({ date: r.visit_date, readings: r.readings ?? {} })));
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return <ChemHistoryChart rows={rows} days={days} onDays={setDays} loading={loading} />;
}
