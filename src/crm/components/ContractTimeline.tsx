import { useState } from "react";
import { History, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTable } from "@/crm/lib/useSavvy";

type ContractEvent = {
  id: string;
  event: string;
  detail: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

const EVENT_LABEL: Record<string, string> = {
  created: "Contract created",
  sent: "Email sent",
  viewed: "Link opened",
  signing_started: "Signature started",
  signed: "Signature added",
  declined: "Declined by recipient",
  voided: "Voided by office",
  expired: "Signing link expired",
  copy_queued: "Signed copy queued",
  copy_emailed: "Signed copy emailed",
  copy_failed: "Signed copy failed",
};

const DOT: Record<string, string> = {
  sent: "bg-[#1FA9BE]",
  viewed: "bg-[#C98A2B]",
  signing_started: "bg-[#C98A2B]",
  signed: "bg-[#2F7D4F]",
  expired: "bg-[#8E1F2C]",
  declined: "bg-[#8E1F2C]",
  voided: "bg-[#8E1F2C]",
  copy_queued: "bg-[#C98A2B]",
  copy_emailed: "bg-[#2F7D4F]",
  copy_failed: "bg-[#8E1F2C]",
};


/**
 * Admin-only audit trail for a single contract. RLS on ss_contract_events
 * already limits reads to office staff; the caller also hides this block.
 */
export default function ContractTimeline({ contractId }: { contractId: string }) {
  const [open, setOpen] = useState(false);

  const { rows: events, loading } = useTable<ContractEvent>(
    `contract-events-${contractId}-${open ? "open" : "closed"}`,
    async () => {
      if (!open) return [];
      const { data } = await supabase
        .from("ss_contract_events")
        .select("id,event,detail,ip,user_agent,created_at")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      return (data ?? []) as ContractEvent[];
    },
  );

  return (
    <div className="mt-2.5 border-t border-black/10 pt-2.5">
      <button className="ss-btn ss-btn-ghost" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <History size={12} /> Audit timeline
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {loading && <div className="text-[0.7rem] opacity-60">Loading history…</div>}
          {!loading && !events.length && (
            <div className="text-[0.7rem] opacity-60">No events recorded yet.</div>
          )}
          {events.map((e) => (
            <div key={e.id} className="flex gap-2">
              <span className={`mt-[6px] h-1.5 w-1.5 shrink-0 ${DOT[e.event] ?? "bg-black/40"}`} />
              <div className="min-w-0">
                <div className="text-[0.74rem] font-semibold">
                  {EVENT_LABEL[e.event] ?? e.event}
                </div>
                <div className="text-[0.68rem] opacity-70">
                  {new Date(e.created_at).toLocaleString()}
                  {e.detail && <> · {e.detail}</>}
                </div>
                {(e.ip || e.user_agent) && (
                  <div className="truncate text-[0.64rem] opacity-50">
                    {e.ip && <>IP {e.ip}</>}
                    {e.ip && e.user_agent && " · "}
                    {e.user_agent}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
