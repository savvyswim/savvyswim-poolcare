import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@/lib/router-compat";
import {
  AlertTriangle, BarChart3, Building2, ClipboardCheck, Percent, ClipboardList, DollarSign, LogOut, Mail,
  Map, Menu, Package, Plug, Settings as SettingsIcon, Truck, Users, Wrench, X, KanbanSquare,
  Activity, BookOpen, Timer, LayoutDashboard, ShoppingBag, Sparkles, Hammer, ShieldCheck, ScrollText, Star, FlaskConical,
  TrendingUp,
  MessageSquare,
  Grid3x3,
  Gauge,
  Wallet,
  SlidersHorizontal,
  MessagesSquare,
  FileText,
  Calculator,
  Workflow,
} from "lucide-react";
import "@/crm/crm.css";
import { SavvyLogo, StripeBand } from "@/crm/components/Brand";
import { PrivacyNotice, useWindowObscured } from "@/crm/components/TechPrivacy";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { useAuth } from "@/hooks/useAuth";
import { canAccess, canAccessPath, type ModuleKey } from "@/crm/lib/permissions";
import { AccessDenied } from "@/crm/components/RequireModule";
import { CrmErrorBoundary } from "@/crm/components/CrmErrorBoundary";

type NavGroup = "Today" | "Sales" | "Operations" | "Marketing" | "Savvy FinOps" | "Admin";
type NavItem = { to: string; label: string; icon: typeof Map; module: ModuleKey; group: NavGroup };

const GROUP_ORDER: NavGroup[] = ["Today", "Sales", "Operations", "Marketing", "Savvy FinOps", "Admin"];

const STAFF_NAV: NavItem[] = [
  // Today
  { to: "/admin/crm", label: "Today's Route", icon: Map, module: "route", group: "Today" },
  { to: "/admin/crm/jobs", label: "Jobs", icon: Wrench, module: "jobs", group: "Today" },
  { to: "/admin/crm/alerts", label: "Alerts", icon: AlertTriangle, module: "alerts", group: "Today" },
  { to: "/admin/crm/tickets", label: "Customer Tickets", icon: MessageSquare, module: "tickets", group: "Today" },
  { to: "/admin/crm/inbox", label: "Text Inbox", icon: MessagesSquare, module: "inbox", group: "Today" },
  { to: "/admin/crm/water-lab", label: "Water Lab", icon: FlaskConical, module: "waterLab", group: "Today" },
  { to: "/admin/crm/pay-per-pool", label: "Payroll", icon: Wallet, module: "payPerPool", group: "Today" },

  // Sales
  { to: "/admin/crm/pipeline", label: "Leads & Pipeline", icon: KanbanSquare, module: "pipeline", group: "Sales" },
  { to: "/admin/crm/products", label: "Savvy Estimate", icon: Package, module: "products", group: "Sales" },
  { to: "/admin/crm/quotes", label: "Savvy Quotes", icon: FileText, module: "quotes", group: "Sales" },
  { to: "/admin/crm/service-plans", label: "Service Plans", icon: ClipboardList, module: "servicePlans", group: "Sales" },
  { to: "/admin/crm/customers", label: "Customers", icon: Users, module: "customers", group: "Sales" },

  // Operations
  { to: "/admin/crm/technicians", label: "Technicians", icon: Users, module: "technicians", group: "Operations" },
  { to: "/admin/crm/scorecard", label: "Tech Scorecard", icon: Timer, module: "scorecard", group: "Operations" },
  { to: "/admin/crm/qc-review", label: "Weekly QC Review", icon: ClipboardCheck, module: "qcReview", group: "Operations" },
  { to: "/admin/crm/trucks", label: "Trucks & Tools", icon: Truck, module: "trucks", group: "Operations" },
  { to: "/admin/crm/inventory", label: "Inventory", icon: Building2, module: "inventory", group: "Operations" },

  // Savvy FinOps
  { to: "/admin/crm/finance", label: "Savvy Ledger", icon: DollarSign, module: "finance", group: "Savvy FinOps" },
  { to: "/admin/crm/job-costing", label: "Job Costing", icon: Calculator, module: "jobCosting", group: "Savvy FinOps" },
  { to: "/admin/crm/margin", label: "Margin Calculator", icon: Percent, module: "margin", group: "Savvy FinOps" },
  { to: "/admin/crm/revenue-growth", label: "Revenue Growth", icon: TrendingUp, module: "finance", group: "Savvy FinOps" },
  { to: "/admin/crm/pricing-matrix", label: "Pricing Matrix", icon: Grid3x3, module: "finance", group: "Savvy FinOps" },
  { to: "/admin/crm/break-even", label: "Break-Even & Profit", icon: Gauge, module: "finance", group: "Savvy FinOps" },
  { to: "/admin/store", label: "Store & Orders", icon: ShoppingBag, module: "store", group: "Savvy FinOps" },

  // Marketing & website
  { to: "/admin/crm/email", label: "Email Center", icon: Mail, module: "email", group: "Marketing" },
  { to: "/admin/crm/reviews", label: "Google Reviews", icon: Star, module: "reviews", group: "Marketing" },
  { to: "/admin/crm/connect", label: "Website Connect", icon: Plug, module: "connect", group: "Marketing" },
  { to: "/admin/designs", label: "Media Library", icon: BookOpen, module: "designs", group: "Marketing" },

  // Admin
  { to: "/admin/crm/reports", label: "Reports", icon: BarChart3, module: "reports", group: "Admin" },
  { to: "/admin/crm/app", label: "Operations Console", icon: LayoutDashboard, module: "console", group: "Admin" },
  { to: "/admin/team", label: "Team & Access", icon: Users, module: "team", group: "Admin" },
  { to: "/admin/activity", label: "Activity Log", icon: Activity, module: "activity", group: "Admin" },
  { to: "/admin/crm/automations", label: "Automations", icon: Workflow, module: "automations", group: "Admin" },
  { to: "/admin/crm/service-setup", label: "Service Setup", icon: SlidersHorizontal, module: "serviceSetup", group: "Admin" },
  { to: "/admin/crm/settings", label: "Settings", icon: SettingsIcon, module: "settings", group: "Admin" },
  { to: "/admin/crm/security", label: "Security", icon: ShieldCheck, module: "security", group: "Admin" },
  { to: "/admin/crm/audit-trail", label: "Audit Trail", icon: ScrollText, module: "security", group: "Admin" },
  { to: "/admin/crm/site-speed", label: "Site Speed", icon: Gauge, module: "siteSpeed", group: "Admin" },
  { to: "/admin/crm/deploy-health", label: "Deploy Health", icon: Activity, module: "deployHealth", group: "Admin" },
  { to: "/admin/cleaning", label: "Website Plans", icon: Sparkles, module: "cleaning", group: "Admin" },
  { to: "/admin/crm/projects", label: "Construction & Remodel", icon: Hammer, module: "projects", group: "Admin" },
];



const LEVEL_LABEL: Record<string, string> = {
  owner: "Owner",
  office_manager: "Office Manager",
  technician: "Technician",
};

export default function CrmLayout({ children }: { children?: React.ReactNode }) {
  const id = useSavvyIdentity();
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const obscured = useWindowObscured();

  useEffect(() => {
    if (!authLoading && !user) nav("/admin/crm/login", { replace: true, state: { from: loc.pathname } });
  }, [authLoading, user, nav, loc.pathname]);

  useEffect(() => {
    if (!id.loading && id.isCustomer) nav("/portal", { replace: true });
  }, [id.loading, id.isCustomer, nav]);

  useEffect(() => setDrawer(false), [loc.pathname]);




  const items = useMemo(
    () => STAFF_NAV.filter((i) => canAccess(id.level, i.module)),
    [id.level],
  );

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ group: g, items: items.filter((i) => i.group === g) })).filter(
        (g) => g.items.length > 0,
      ),
    [items],
  );

  const allowed = canAccessPath(id.level, loc.pathname);


  const mobilePrimary = items.slice(0, 4);


  if (authLoading || id.loading) {
    return (
      <div className="savvy-crm flex min-h-screen items-center justify-center">
        <SavvyLogo size="lg" />
      </div>
    );
  }

  if (!id.level) {
    return (
      <div className="savvy-crm flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <SavvyLogo size="lg" />
        <div className="ss-card max-w-sm p-5">
          <h2 className="text-[0.9rem]">No staff access</h2>
          <p className="mt-2 text-[0.85rem] opacity-70">
            This account isn't on the Savvy Swim staff roster yet. Ask an owner to add you in
            Technicians.
          </p>
          <button className="ss-btn mt-4" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const techLocked = id.isTech;

  return (
    <div
      className={`savvy-crm ${techLocked ? "ss-no-select" : ""} ${
        techLocked && obscured ? "ss-privacy-blur" : ""
      }`}
      onContextMenu={techLocked ? (e) => e.preventDefault() : undefined}
    >
      {techLocked && obscured && <PrivacyNotice />}

      {/* sticky header */}
      <header className="sticky top-0 z-40 lg:ml-[232px] xl:ml-[248px]" style={{ background: "hsl(var(--ss-cream))" }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <SavvyLogo size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-3" />

        </div>
        <StripeBand />
      </header>

      {/* desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-50 hidden h-screen w-[232px] xl:w-[248px] min-w-0 flex-col overflow-hidden border-r p-4 lg:flex"
        style={{ borderColor: "hsl(var(--ss-sand))", background: "hsl(var(--ss-white))" }}
      >
        <SavvyLogo size="md" />
        <nav className="mt-6 flex-1 space-y-3 overflow-y-auto">
          {groups.map((g) => (
            <NavGroupBlock key={g.group} group={g.group} items={g.items} pathname={loc.pathname} />
          ))}
        </nav>

        <SidebarFooter level={id.level} name={id.staffName} onSignOut={signOut} />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div
            className="absolute left-0 top-0 flex h-full w-[min(84vw,264px)] min-w-0 flex-col overflow-hidden p-4"
            style={{ background: "hsl(var(--ss-white))" }}
          >
            <div className="flex items-start justify-between">
              <SavvyLogo size="md" />
              <button aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <nav className="mt-6 flex-1 space-y-3 overflow-y-auto">
              {groups.map((g) => (
                <NavGroupBlock key={g.group} group={g.group} items={g.items} pathname={loc.pathname} />
              ))}
            </nav>

            <SidebarFooter level={id.level} name={id.staffName} onSignOut={signOut} />
          </div>
        </div>
      )}

      <main className="px-4 pb-28 pt-4 lg:pb-10 lg:pl-[248px] lg:pr-8 xl:pl-[264px]">
        <div key={loc.pathname} className="ss-page-enter mx-auto max-w-[1440px]">
          <CrmErrorBoundary resetKey={loc.pathname}>
            {allowed ? children ?? <Outlet /> : <AccessDenied />}
          </CrmErrorBoundary>
        </div>
      </main>

      {/* mobile bottom tabs */}
      {mobilePrimary.length > 1 && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex border-t lg:hidden"
          style={{ background: "hsl(var(--ss-white))", borderColor: "hsl(var(--ss-sand))" }}
        >
          {mobilePrimary.map((i) => {
            const active = loc.pathname === i.to;
            const Icon = i.icon;
            return (
              <Link
                key={i.to}
                to={i.to}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 !no-underline"
                style={{ color: active ? "hsl(var(--ss-burgundy))" : "hsl(var(--ss-ink) / .5)" }}
              >
                <Icon size={17} />
                <span className="ss-tag" style={{ fontSize: "0.5rem", color: "inherit" }}>
                  {i.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
          <button
            className="flex flex-1 flex-col items-center gap-0.5 py-2"
            style={{ color: "hsl(var(--ss-ink) / .5)" }}
            onClick={() => setDrawer(true)}
          >
            <Menu size={17} />
            <span className="ss-tag" style={{ fontSize: "0.5rem", color: "inherit" }}>
              More
            </span>
          </button>
        </nav>
      )}
    </div>
  );
}

function NavGroupBlock({
  group,
  items,
  pathname,
}: {
  group: NavGroup;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="ss-tag px-2.5" style={{ fontSize: "0.5rem", opacity: 0.5 }}>
        {group}
      </div>
      {items.map((i) => (
        <NavRow
          key={i.to}
          item={i}
          active={pathname === i.to || (i.to !== "/admin/crm" && pathname.startsWith(`${i.to}/`))}
        />
      ))}
    </div>
  );
}


function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex min-w-0 items-center gap-2.5 rounded-[9px] px-2.5 py-2 !no-underline"
      title={item.label}
      style={{
        background: active ? "hsl(var(--ss-burgundy) / .1)" : "transparent",
        color: active ? "hsl(var(--ss-burgundy))" : "hsl(var(--ss-ink) / .78)",
        fontFamily: "Oswald, sans-serif",
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        lineHeight: 1.2,
        textTransform: "uppercase",
      }}
    >
      <Icon size={15} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function SidebarFooter({
  level,
  name,
  onSignOut,
}: {
  level: string;
  name: string | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
      <div className="ss-tag" style={{ fontSize: "0.5rem" }}>
        {LEVEL_LABEL[level] ?? level} access
      </div>
      <div className="mt-0.5 truncate text-[0.82rem] font-medium" title={name ?? undefined}>
        {name}
      </div>

      <button
        className="ss-btn ss-btn-ghost mt-2 w-full"
        onClick={() => void onSignOut()}
      >
        <LogOut size={13} /> Sign out
      </button>
    </div>
  );
}
