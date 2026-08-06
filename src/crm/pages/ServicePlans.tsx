import { Link } from "@/lib/router-compat";
import PricingTab from "@/crm/components/PricingTab";
import { SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { SERVICE_PLANS } from "@/crm/lib/pricingEngine";

/** Service plans & pricing engine — moved out of Savvy Estimate into its own module. */
export default function ServicePlans() {
  const { isOwner } = useSavvyIdentity();

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Service plans"
        sub="City rate card, plan tiers and add-ons — the pricing engine every quote is built from"
      />

      <div className="ss-card p-4">
        <div className="ss-label mb-2">Plan tiers · feed straight into Savvy Estimate</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SERVICE_PLANS.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-md border p-3"
              style={{ borderColor: "hsl(var(--ss-sand))" }}
            >
              <div className="text-[0.95rem] font-bold">{p.name}</div>
              <div className="mt-0.5 text-[0.72rem] opacity-70">{p.tagline}</div>
              <ul className="mt-2 flex-1 space-y-1 text-[0.75rem]">
                {p.scope.map((s) => (
                  <li key={s} className="flex gap-1.5">
                    <span className="opacity-40">—</span>
                    <span className="opacity-85">{s}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={`/admin/crm/products?plan_id=${p.id}`}
                className="ss-btn ss-btn-ghost mt-3 justify-center"
              >
                QUOTE THIS PLAN
              </Link>
            </div>
          ))}
        </div>
      </div>

      <PricingTab isOwner={isOwner} />
    </div>
  );
}
