import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CRM_IS_EXTERNAL } from "@/lib/app-links";

type Props = {
  /** Path inside the CRM app, e.g. "/portal" or "/admin/crm/login". */
  href: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
};

/**
 * Renders an in-app link while the CRM lives in this project, and a plain
 * cross-domain link once the CRM is deployed separately.
 */
export function AppHandoffLink({ href, className, onClick, children }: Props) {
  if (CRM_IS_EXTERNAL) {
    return (
      <a href={href} className={className} onClick={onClick} rel="noopener">
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

/**
 * Drop-in guard for legacy URLs (savvyswim.com/portal, /admin/crm/...). When the
 * CRM has moved, it forwards the visitor to the CRM app; otherwise it renders the
 * page as before.
 */
export function CrmMovedRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.18em] opacity-70">Redirecting</p>
      <p className="text-base">
        Taking you to the Savvy Swim app…{" "}
        <a href={to} className="underline" rel="noopener">
          Continue
        </a>
      </p>
    </div>
  );
}
