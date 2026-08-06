import { SectionTitle } from "@/crm/components/Brand";
import MarginCalculator from "@/crm/components/MarginCalculator";

export default function MarginCalculatorPage() {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Margin Calculator"
        sub="Price your pumps, chemicals, equipment & services with confidence. Know your numbers. Protect your profit."
      />
      <MarginCalculator />
    </div>
  );
}
