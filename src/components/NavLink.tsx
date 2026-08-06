import { Link } from "@/lib/router-compat";
import { useLocation } from "@/lib/router-compat";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<ComponentProps<typeof Link>, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, ...props }, ref) => {
    const { pathname } = useLocation();
    const target = typeof to === "string" ? (to.split("?")[0] ?? "").split("#")[0] ?? "" : String(to);
    const isActive = pathname === target || (target !== "/" && pathname.startsWith(`${target}/`));
    return <Link ref={ref} to={to} className={cn(className, isActive && activeClassName)} {...props} />;
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
