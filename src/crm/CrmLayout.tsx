import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { claimStaffSeat } from "@/lib/accounts.functions";

import { Link, Outlet, useLocation, useNavigate } from "@/lib/router-compat";
import { LogOut, Menu, X, Search, Bell, PanelLeftClose, PanelLeft } from "lucide-react";
import "@/crm/crm.css";
import { SavvyLogo } from "@/crm/components/Brand";
import {
  PrivacyNotice,
  useCaptureGuard,
  useWindowObscured,
} from "@/crm/components/TechPrivacy";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";
import { usePrivacyOverlayConfig } from "@/crm/lib/usePrivacyOverlay";
import { useAuth } from "@/hooks/useAuth";
import { canAccess, canAccessPath } from "@/crm/lib/permissions";
import { AccessDenied } from "@/crm/components/RequireModule";
import { CrmErrorBoundary } from "@/crm/components/CrmErrorBoundary";
import {
  WORKSPACES,
  getWorkspace,
  workspaceForPath,
  type NavItem,
  type Workspace,
  type WorkspaceKey,
} from "@/crm/lib/workspaces";
import { AppLauncher } from "@/crm/components/AppLauncher";
import { PersonalizeMenu, backgroundUrl } from "@/crm/components/PersonalizeMenu";
import { SavvyAiDock } from "@/crm/components/SavvyAiDock";
import { useCrmPrefs } from "@/crm/lib/useCrmPrefs";

const LEVEL_LABEL: Record<string, string> = {
  owner: "Owner",
  office_manager: "Office manager",
  technician: "Technician",
  contractor: "Contractor",
};

export default function CrmLayout({ children }: { children?: React.ReactNode }) {
  const id = useSavvyIdentity();
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const claimSeat = useServerFn(claimStaffSeat);
  const obscured = useWindowObscured();
  const { config: privacyConfig } = usePrivacyOverlayConfig();
  const { prefs, update } = useCrmPrefs();
  const techLocked = !!id.isTech && privacyConfig.enabled;
  const captureBlocked = useCaptureGuard(techLocked);

  useEffect(() => {
    if (!authLoading && !user) nav("/admin/crm/login", { replace: true, state: { from: loc.pathname } });
  }, [authLoading, user, nav, loc.pathname]);

  useEffect(() => {
    if (!id.loading && id.isCustomer) nav("/portal", { replace: true });
  }, [id.loading, id.isCustomer, nav]);

  useEffect(() => setDrawer(false), [loc.pathname]);

  /** Workspaces this person is allowed to open at all. */
  const available = useMemo<Workspace[]>(() => {
    const list = WORKSPACES.map((w) => ({
      ...w,
      items: w.items.filter((i) => canAccess(id.level, i.module)),
    })).filter((w) => w.items.length > 0);
    // A technician gets the Field workspace as their world.
    return id.isTech ? list.filter((w) => w.key === "field" || w.key === "myday") : list;
  }, [id.level, id.isTech]);

  const [manualWs, setManualWs] = useState<WorkspaceKey | null>(null);
  const activeKey: WorkspaceKey =
    workspaceForPath(loc.pathname) === null
      ? manualWs ?? prefs.last_workspace ?? available[0]?.key ?? "myday"
      : manualWs && getWorkspace(manualWs).items.some((i) => i.to === loc.pathname)
        ? manualWs
        : (workspaceForPath(loc.pathname) as WorkspaceKey);

  const activeWs = useMemo(
    () => available.find((w) => w.key === activeKey) ?? available[0] ?? getWorkspace("myday"),
    [available, activeKey],
  );

  const groups = useMemo(
    () =>
      activeWs.groups
        .map((g) => ({ group: g, items: activeWs.items.filter((i) => i.group === g) }))
        .filter((g) => g.items.length > 0),
    [activeWs],
  );

  const allItems = useMemo(
    () => available.flatMap((w) => w.items.map((i) => ({ ...i, ws: w.label }))),
    [available],
  );
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allItems.filter((i) => i.label.toLowerCase().includes(q) || i.ws.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allItems]);

  const allowed = canAccessPath(id.level, loc.pathname);
  const mobilePrimary = activeWs.items.slice(0, 4);
  const collapsed = prefs.sidebar_collapsed;
  const sidebarW = collapsed ? 68 : 244;
  const bgUrl = backgroundUrl(prefs.background);

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
        <div className="ss-card w-full max-w-sm p-5">
          <h2 className="text-[0.9rem]">No staff access</h2>
          <p className="mt-2 text-[0.85rem] opacity-70">
            Signed in as <strong>{user?.email ?? "unknown account"}</strong>. This login isn't
            linked to a Savvy Swim roster entry yet.
          </p>
          {claimMsg ? <p className="mt-3 text-[0.8rem] opacity-80">{claimMsg}</p> : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              className="ss-btn"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                setClaimMsg(null);
                try {
                  const res = await claimSeat({ data: {} } as any);
                  if (res?.ok) {
                    setClaimMsg("Roster entry linked — loading your workspace…");
                    await id.refresh();
                  } else {
                    setClaimMsg(res?.reason ?? "Could not link this account.");
                  }
                } catch (e: any) {
                  setClaimMsg(e?.message ?? "Could not link this account.");
                } finally {
                  setClaiming(false);
                }
              }}
            >
              {claiming ? "Linking…" : "Link my staff account"}
            </button>
            <button className="ss-btn ss-btn-ghost" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
          <p className="mt-3 text-[0.75rem] opacity-60">
            If linking fails, ask an owner to add this email in Technicians.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`savvy-crm min-h-screen ${techLocked ? "ss-no-select ss-tech-locked" : ""} ${
        techLocked && obscured ? "ss-privacy-blur" : ""
      } ${techLocked && captureBlocked ? "ss-capture-masked" : ""}`}
      data-theme={prefs.theme}
      data-density={prefs.density}
      data-bg={bgUrl ? "photo" : "plain"}
      style={bgUrl ? { backgroundImage: `linear-gradient(hsl(var(--ss-canvas) / .82), hsl(var(--ss-canvas) / .92)), url(${bgUrl})` } : undefined}
      onContextMenu={techLocked ? (e) => e.preventDefault() : undefined}
    >
      {techLocked && obscured && <PrivacyNotice />}
      {techLocked && captureBlocked && !obscured && (
        <PrivacyNotice message="Copying, printing or saving customer information isn't allowed on a technician account." />
      )}

      {/* top bar */}
      <header
        className="ss-shell-panel sticky top-0 z-40 border-b"
        style={{ marginLeft: 0, paddingLeft: 0 }}
      >
        <div
          className="flex items-center gap-3 px-3 py-2"
          style={{ paddingLeft: undefined }}
        >
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <SavvyLogo size="sm" />
          </div>

          <div className="hidden lg:block" style={{ width: sidebarW - 12 }} />

          <AppLauncher
            active={activeWs.key}
            available={available}
            onPick={(w) => {
              setManualWs(w.key);
              update({ last_workspace: w.key });
            }}
          />

          <div className="relative ml-auto hidden min-w-0 flex-1 max-w-md md:block">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              className="ss-input w-full pl-8"
              placeholder="Search the workspace…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {results.length > 0 ? (
              <div className="ss-card absolute left-0 right-0 z-50 mt-1 p-1">
                {results.map((r) => {
                  const Icon = r.icon;
                  return (
                    <Link
                      key={r.ws + r.to + r.label}
                      to={r.to}
                      className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 !no-underline !text-inherit hover:bg-black/5"
                      onClick={() => setSearch("")}
                    >
                      <Icon size={14} className="opacity-50" />
                      <span className="text-[0.82rem]">{r.label}</span>
                      <span className="ml-auto text-[0.68rem] opacity-50">{r.ws}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link to="/admin/crm/alerts" className="ss-btn ss-btn-ghost" aria-label="Alerts" title="Alerts">
              <Bell size={15} />
            </Link>
            <PersonalizeMenu prefs={prefs} update={update} />
          </div>
        </div>
      </header>

      {/* desktop sidebar */}
      <aside
        className="ss-shell-panel fixed left-0 top-0 z-50 hidden h-screen min-w-0 flex-col overflow-hidden border-r p-3 lg:flex"
        style={{ width: sidebarW }}
      >
        <div className="flex items-start justify-between gap-2">
          {collapsed ? <SavvyLogo size="sm" /> : <SavvyLogo size="md" />}
          <button
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className="opacity-50 hover:opacity-100"
            onClick={() => update({ sidebar_collapsed: !collapsed })}
          >
            {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {!collapsed ? (
          <div className="ss-tag mt-4" style={{ fontSize: "0.5rem" }}>
            {activeWs.label}
          </div>
        ) : null}

        <nav className="mt-2 flex-1 space-y-3 overflow-y-auto">
          {groups.map((g) => (
            <NavGroupBlock
              key={g.group}
              group={g.group}
              items={g.items}
              pathname={loc.pathname}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <SidebarFooter level={id.level} name={id.staffName} onSignOut={signOut} collapsed={collapsed} />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div
            className="ss-shell-panel absolute left-0 top-0 flex h-full w-[min(86vw,280px)] min-w-0 flex-col overflow-hidden p-4"
          >
            <div className="flex items-start justify-between">
              <SavvyLogo size="md" />
              <button aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-1.5">
              {available.map((w) => {
                const Icon = w.icon;
                return (
                  <Link
                    key={w.key}
                    to={w.home}
                    className="flex items-center gap-1.5 rounded-[8px] border px-2 py-1.5 !no-underline !text-inherit"
                    style={{
                      borderColor: "hsl(var(--ss-line))",
                      background: w.key === activeWs.key ? "hsl(var(--ss-burgundy) / .08)" : undefined,
                    }}
                    onClick={() => {
                      setManualWs(w.key);
                      update({ last_workspace: w.key });
                    }}
                  >
                    <Icon size={13} />
                    <span className="truncate text-[0.74rem]">{w.label}</span>
                  </Link>
                );
              })}
            </div>

            <nav className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {groups.map((g) => (
                <NavGroupBlock key={g.group} group={g.group} items={g.items} pathname={loc.pathname} />
              ))}
            </nav>

            <SidebarFooter level={id.level} name={id.staffName} onSignOut={signOut} />
          </div>
        </div>
      )}

      <main
        className="px-4 pb-28 pt-4 lg:pb-10 lg:pr-8"
        style={{ paddingLeft: undefined }}
      >
        <div
          key={loc.pathname}
          className="ss-page-enter mx-auto max-w-[1440px] lg:pl-[var(--ss-sidebar)]"
          style={{ ["--ss-sidebar" as string]: `${sidebarW - 16}px` }}
        >
          <CrmErrorBoundary resetKey={loc.pathname}>
            {allowed ? children ?? <Outlet /> : <AccessDenied />}
          </CrmErrorBoundary>
        </div>
      </main>

      <SavvyAiDock workspace={activeWs.label} page={loc.pathname} />

      {/* mobile bottom tabs */}
      {mobilePrimary.length > 1 && (
        <nav className="ss-shell-panel fixed bottom-0 left-0 right-0 z-40 flex border-t lg:hidden">
          {mobilePrimary.map((i) => {
            const active = loc.pathname === i.to;
            const Icon = i.icon;
            return (
              <Link
                key={i.to + i.label}
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
  collapsed = false,
}: {
  group: string;
  items: NavItem[];
  pathname: string;
  collapsed?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed ? (
        <div className="ss-tag px-2.5" style={{ fontSize: "0.5rem", opacity: 0.5 }}>
          {group}
        </div>
      ) : null}
      {items.map((i) => (
        <NavRow
          key={i.to + i.label}
          item={i}
          collapsed={collapsed}
          active={pathname === i.to || (i.to !== "/admin/crm" && pathname.startsWith(`${i.to}/`))}
        />
      ))}
    </div>
  );
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`ss-navrow !no-underline ${collapsed ? "justify-center" : ""}`}
      data-active={active}
      title={item.label}
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
    </Link>
  );
}

function SidebarFooter({
  level,
  name,
  onSignOut,
  collapsed = false,
}: {
  level: string;
  name: string | null;
  onSignOut: () => Promise<void>;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <button className="ss-btn ss-btn-ghost mt-3 w-full" aria-label="Sign out" onClick={() => void onSignOut()}>
        <LogOut size={14} />
      </button>
    );
  }
  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: "hsl(var(--ss-line))" }}>
      <div className="ss-tag" style={{ fontSize: "0.5rem" }}>
        {LEVEL_LABEL[level] ?? level} access
      </div>
      <div className="mt-0.5 truncate text-[0.82rem] font-medium" title={name ?? undefined}>
        {name}
      </div>
      <button className="ss-btn ss-btn-ghost mt-2 w-full" onClick={() => void onSignOut()}>
        <LogOut size={13} /> Sign out
      </button>
    </div>
  );
}
