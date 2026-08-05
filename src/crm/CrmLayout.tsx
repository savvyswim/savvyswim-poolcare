import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, BarChart3, Building2, ClipboardList, DollarSign, LogOut, Mail,
  Map, Menu, Package, Plug, Settings as SettingsIcon, Truck, Users, Wrench, X, KanbanSquare,
} from "lucide-react";
import "@/crm/crm.css";
import { SavvyLogo, StripeBand } from "@/crm/components/Brand";
import { PrivacyNotice, TechWatermark, useWindowObscured } from "@/crm/components/TechPrivacy";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: typeof Map; owner?: boolean };

const STAFF_NAV: NavItem[] = [
  { to: "/crm", label: "Route", icon: Map },
  { to: "/crm/customers", label: "Customers", icon: Users },
  { to: "/crm/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/crm/jobs", label: "Jobs", icon: Wrench },
  { to: "/crm/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/crm/technicians", label: "Technicians", icon: ClipboardList },
  { to: "/crm/products", label: "Products & Services", icon: Package },
  { to: "/crm/finance", label: "Finance", icon: DollarSign, owner: true },
  { to: "/crm/trucks", label: "Trucks & Tools", icon: Truck },
  { to: "/crm/inventory", label: "Inventory", icon: Building2 },
  { to: "/crm/email", label: "Email Center", icon: Mail },
  { to: "/crm/reports", label: "Reports", icon: BarChart3 },
  { to: "/crm/connect", label: "Website Connect", icon: Plug },
  { to: "/crm/settings", label: "Settings", icon: SettingsIcon },
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
  const [synced, setSynced] = useState<string | null>(null);
  const obscured = useWindowObscured();

  useEffect(() => {
    if (!authLoading && !user) nav("/crm/login", { replace: true });
  }, [authLoading, user, nav]);

  useEffect(() => {
    if (!id.loading && id.isCustomer) nav("/portal", { replace: true });
  }, [id.loading, id.isCustomer, nav]);

  useEffect(() => setDrawer(false), [loc.pathname]);

  useEffect(() => {
    supabase.from("ss_settings").select("value").eq("key", "quickbooks").maybeSingle()
      .then(({ data }) => setSynced((data?.value as { last_synced?: string })?.last_synced ?? null));
  }, []);

  const items = useMemo(() => {
    if (id.isTech) return [STAFF_NAV[0]];
    return STAFF_NAV.filter((i) => !i.owner || id.isOwner);
  }, [id.isTech, id.isOwner]);

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
      {techLocked && <TechWatermark initials={id.initials ?? "SS"} />}
      {techLocked && obscured && <PrivacyNotice />}

      {/* sticky header */}
      <header className="sticky top-0 z-40" style={{ background: "hsl(var(--ss-cream))" }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 lg:pl-[232px]">
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
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="ss-tag" style={{ fontSize: "0.5rem" }}>
                QuickBooks · Last synced
              </div>
              <div className="ss-num text-[0.72rem] opacity-70">
                {synced ? new Date(synced).toLocaleDateString() : "Never"}
              </div>
            </div>
            <button
              className="ss-btn ss-btn-ghost"
              onClick={async () => {
                await supabase.from("ss_settings").update({
                  value: { last_synced: new Date().toISOString() },
                }).eq("key", "quickbooks");
                setSynced(new Date().toISOString());
              }}
            >
              Sync now
            </button>
          </div>
        </div>
        <StripeBand />
      </header>

      {/* desktop sidebar */}
      <aside
        className="fixed left-0 top-0 hidden h-screen w-[216px] flex-col border-r p-4 lg:flex"
        style={{ borderColor: "hsl(var(--ss-sand))", background: "hsl(var(--ss-white))" }}
      >
        <SavvyLogo size="md" />
        <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
          {items.map((i) => (
            <NavRow key={i.to} item={i} active={loc.pathname === i.to} />
          ))}
        </nav>
        <SidebarFooter level={id.level} name={id.staffName} onSignOut={signOut} />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div
            className="absolute left-0 top-0 flex h-full w-[264px] flex-col p-4"
            style={{ background: "hsl(var(--ss-white))" }}
          >
            <div className="flex items-start justify-between">
              <SavvyLogo size="md" />
              <button aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
              {items.map((i) => (
                <NavRow key={i.to} item={i} active={loc.pathname === i.to} />
              ))}
            </nav>
            <SidebarFooter level={id.level} name={id.staffName} onSignOut={signOut} />
          </div>
        </div>
      )}

      <main className="px-4 pb-28 pt-4 lg:pb-10 lg:pl-[232px] lg:pr-6">
        <div className="mx-auto max-w-[1180px]">{children ?? <Outlet />}</div>
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

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 !no-underline"
      style={{
        background: active ? "hsl(var(--ss-burgundy) / .1)" : "transparent",
        color: active ? "hsl(var(--ss-burgundy))" : "hsl(var(--ss-ink) / .78)",
        fontFamily: "Oswald, sans-serif",
        fontSize: "0.76rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      <Icon size={15} />
      {item.label}
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
      <div className="mt-0.5 text-[0.82rem] font-medium">{name}</div>
      <button
        className="ss-btn ss-btn-ghost mt-2 w-full"
        onClick={() => void onSignOut()}
      >
        <LogOut size={13} /> Sign out
      </button>
    </div>
  );
}
