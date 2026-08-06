import { Link } from "@/lib/router-compat";
import { Seo } from "@/components/Seo";

export default function CrmApp() {
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <Seo
        title="Savvy Swim Operations CRM"
        description="Internal Savvy Swim operations console for routes, customers, techs and finance."
        path="/admin/crm/app"
      />
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs uppercase tracking-widest">
        <span className="font-semibold">Operations console</span>
        <Link to="/admin/crm" className="underline underline-offset-4">
          Back to CRM
        </Link>

      </div>
      <iframe
        src="/crm-app.html"
        title="Savvy Swim operations console"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
