import PricingTab from "@/crm/components/PricingTab";
import { SectionTitle } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

/** Service plans & pricing engine — moved out of Savvy Estimate into its own module. */
export default function ServicePlans() {
  const { isOwner } = useSavvyIdentity();

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Service plans"
        sub="City rate card, plan tiers and add-ons — the pricing engine every quote is built from"
      />
      <PricingTab isOwner={isOwner} />
    </div>
  );
}
