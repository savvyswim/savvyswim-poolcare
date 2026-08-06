import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { Lock } from "lucide-react";
import "@/crm/crm.css";
import { SavvyLogo } from "@/crm/components/Brand";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { useAuth } from "@/hooks/useAuth";
import { canAccess, type ModuleKey } from "@/crm/lib/permissions";

export function AccessDenied({ module }: { module?: string }) {
  return (
    <div className="ss-card mx-auto mt-10 max-w-md p-6 text-center">
      <Lock size={20} className="mx-auto opacity-60" />
      <h2 className="mt-3 text-[0.95rem] font-semibold">Restricted module</h2>
      <p className="mt-2 text-[0.85rem] opacity-70">
        Your access level doesn't include {module ? `the ${module} module` : "this area"}. Ask an
        owner if you need it.
      </p>
      <Link to="/admin/crm" className="ss-btn mt-4 inline-flex">
        Back to my route
      </Link>
    </div>
  );
}

/** Wraps standalone admin pages that live outside the CRM layout. */
export function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const id = useSavvyIdentity();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!authLoading && !user)
      nav("/admin/crm/login", { replace: true, state: { from: loc.pathname } });
  }, [authLoading, user, nav, loc.pathname]);

  if (authLoading || id.loading) {
    return (
      <div className="savvy-crm flex min-h-screen items-center justify-center">
        <SavvyLogo size="lg" />
      </div>
    );
  }

  if (!canAccess(id.level, module)) {
    return (
      <div className="savvy-crm min-h-screen p-6">
        <AccessDenied module={module} />
      </div>
    );
  }

  return <>{children}</>;
}
