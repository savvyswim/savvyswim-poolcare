import { Suspense, lazy, useRef } from "react";
import { format } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { SERVICES } from "@/components/LeadForm";

/**
 * On-page contact form. Same hardened intake as the modal:
 * POST /api/public/leads → lead row (phone + email) → CRM handoff.
 */
const LeadForm = lazy(() => import("@/components/LeadForm"));

export default function InlineLeadForm({
  cta,
  source,
  submitLabel = "Request my quote",
}: {
  cta: string;
  source: string;
  submitLabel?: string;
}) {
  const openedAt = useRef(Date.now());
  const navigate = useNavigate();

  return (
    <Suspense
      fallback={
        <div className="min-h-[420px] animate-pulse rounded-sm border border-hairline bg-secondary/30" />
      }
    >
      <LeadForm
        cta={cta}
        optionsLabel="A service"
        options={SERVICES}
        source={source}
        submitLabel={submitLabel}
        openedAt={openedAt.current}
        onCancel={() => {
          openedAt.current = Date.now();
        }}
        onDone={(summary) => {
          void navigate({
            to: "/thank-you",
            search: {
              ...(summary.reference ? { ref: summary.reference } : {}),
              ...(summary.date ? { date: format(summary.date, "yyyy-MM-dd") } : {}),
              ...(summary.time ? { time: summary.time } : {}),
              ...(summary.email ? { email: summary.email } : {}),
              kind: "booking",
            },
          });
        }}
      />
    </Suspense>
  );
}
