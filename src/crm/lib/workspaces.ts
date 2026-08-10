import {
  AlertTriangle, BarChart3, Building2, ClipboardCheck, Percent, ClipboardList, DollarSign, Mail,
  Map as MapIcon, Package, Plug, Settings as SettingsIcon, Truck, Users, Wrench, KanbanSquare,
  Activity, BookOpen, Timer, LayoutDashboard, ShoppingBag, Sparkles, Hammer, ShieldCheck,
  ScrollText, Star, FlaskConical, TrendingUp, MessageSquare, Grid3x3, Gauge, Wallet,
  SlidersHorizontal, MessagesSquare, FileText, Calculator, Workflow, Home, Megaphone,
  Briefcase, PieChart, Compass,
} from "lucide-react";
import type { ModuleKey } from "@/crm/lib/permissions";

export type WorkspaceKey =
  | "myday"
  | "marketing"
  | "sales"
  | "operations"
  | "financial"
  | "field"
  | "admin";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof MapIcon;
  module: ModuleKey;
  group: string;
};

export type Workspace = {
  key: WorkspaceKey;
  label: string;
  blurb: string;
  icon: typeof MapIcon;
  home: string;
  groups: string[];
  items: NavItem[];
};

/**
 * Every page that existed before still exists — it is only filed under the
 * workspace it belongs to. Nothing was dropped in the reorganisation.
 */
export const WORKSPACES: Workspace[] = [
  {
    key: "myday",
    label: "My day",
    blurb: "Your greeting, tasks and numbers",
    icon: Home,
    home: "/admin/crm/home",
    groups: ["Today"],
    items: [
      { to: "/admin/crm/home", label: "My day", icon: Home, module: "route", group: "Today" },
      { to: "/admin/crm", label: "Today's route", icon: MapIcon, module: "route", group: "Today" },
      { to: "/admin/crm/jobs", label: "Jobs", icon: Wrench, module: "jobs", group: "Today" },
      { to: "/admin/crm/alerts", label: "Alerts", icon: AlertTriangle, module: "alerts", group: "Today" },
      { to: "/admin/crm/tickets", label: "Customer tickets", icon: MessageSquare, module: "tickets", group: "Today" },
      { to: "/admin/crm/inbox", label: "Text inbox", icon: MessagesSquare, module: "inbox", group: "Today" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    blurb: "Leads, campaigns and attribution",
    icon: Megaphone,
    home: "/admin/crm/marketing",
    groups: ["Overview", "Demand", "Channels"],
    items: [
      { to: "/admin/crm/marketing", label: "Marketing home", icon: BarChart3, module: "pipeline", group: "Overview" },
      { to: "/admin/crm/pipeline", label: "Leads & pipeline", icon: KanbanSquare, module: "pipeline", group: "Demand" },
      { to: "/admin/crm/inspections", label: "Inspection requests", icon: ClipboardList, module: "inspections", group: "Demand" },
      { to: "/admin/crm/reviews", label: "Google reviews", icon: Star, module: "reviews", group: "Channels" },
      { to: "/admin/crm/email", label: "Email center", icon: Mail, module: "email", group: "Channels" },
      { to: "/admin/crm/connect", label: "Website connect", icon: Plug, module: "connect", group: "Channels" },
      { to: "/admin/designs", label: "Media library", icon: BookOpen, module: "designs", group: "Channels" },
      { to: "/admin/cleaning", label: "Website plans", icon: Sparkles, module: "cleaning", group: "Channels" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    blurb: "Quotes, contracts and customers",
    icon: Briefcase,
    home: "/admin/crm/sales",
    groups: ["Overview", "Deals", "Accounts"],
    items: [
      { to: "/admin/crm/sales", label: "Sales home", icon: BarChart3, module: "quotes", group: "Overview" },
      { to: "/admin/crm/products", label: "Savvy estimate", icon: Package, module: "products", group: "Deals" },
      { to: "/admin/crm/quotes", label: "Savvy quotes", icon: FileText, module: "quotes", group: "Deals" },
      { to: "/admin/crm/service-plans", label: "Service plans", icon: ClipboardList, module: "servicePlans", group: "Deals" },
      { to: "/admin/crm/customers", label: "Customers", icon: Users, module: "customers", group: "Accounts" },
      { to: "/admin/store", label: "Store & orders", icon: ShoppingBag, module: "store", group: "Accounts" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    blurb: "Routes, techs, water and stock",
    icon: Compass,
    home: "/admin/crm/operations",
    groups: ["Overview", "Field", "Quality", "Assets"],
    items: [
      { to: "/admin/crm/operations", label: "Operations home", icon: BarChart3, module: "route", group: "Overview" },
      { to: "/admin/crm", label: "Today's route", icon: MapIcon, module: "route", group: "Field" },
      { to: "/admin/crm/jobs", label: "Jobs", icon: Wrench, module: "jobs", group: "Field" },
      { to: "/admin/crm/technicians", label: "Technicians", icon: Users, module: "technicians", group: "Field" },
      { to: "/admin/crm/projects", label: "Construction & remodel", icon: Hammer, module: "projects", group: "Field" },
      { to: "/admin/crm/water-lab", label: "Water lab", icon: FlaskConical, module: "waterLab", group: "Quality" },
      { to: "/admin/crm/scorecard", label: "Tech scorecard", icon: Timer, module: "scorecard", group: "Quality" },
      { to: "/admin/crm/qc-review", label: "Weekly QC review", icon: ClipboardCheck, module: "qcReview", group: "Quality" },
      { to: "/admin/crm/alerts", label: "Alerts", icon: AlertTriangle, module: "alerts", group: "Quality" },
      { to: "/admin/crm/inventory", label: "Inventory", icon: Building2, module: "inventory", group: "Assets" },
      { to: "/admin/crm/trucks", label: "Trucks & tools", icon: Truck, module: "trucks", group: "Assets" },
    ],
  },
  {
    key: "financial",
    label: "Financial",
    blurb: "Books, margins and payroll",
    icon: PieChart,
    home: "/admin/crm/financial",
    groups: ["Overview", "Books", "Profitability"],
    items: [
      { to: "/admin/crm/financial", label: "Financial home", icon: BarChart3, module: "finance", group: "Overview" },
      { to: "/admin/crm/finance", label: "Savvy ledger", icon: DollarSign, module: "finance", group: "Books" },
      { to: "/admin/crm/pay-per-pool", label: "Payroll", icon: Wallet, module: "payPerPool", group: "Books" },
      { to: "/admin/crm/job-costing", label: "Job costing", icon: Calculator, module: "jobCosting", group: "Profitability" },
      { to: "/admin/crm/chem-costs", label: "Chemical costs", icon: FlaskConical, module: "jobCosting", group: "Profitability" },
      { to: "/admin/crm/margin", label: "Margin calculator", icon: Percent, module: "margin", group: "Profitability" },
      { to: "/admin/crm/revenue-growth", label: "Revenue growth", icon: TrendingUp, module: "finance", group: "Profitability" },
      { to: "/admin/crm/pricing-matrix", label: "Pricing matrix", icon: Grid3x3, module: "finance", group: "Profitability" },
      { to: "/admin/crm/break-even", label: "Break-even & profit", icon: Gauge, module: "finance", group: "Profitability" },
    ],
  },
  {
    key: "field",
    label: "Field",
    blurb: "The technician app",
    icon: Truck,
    home: "/admin/crm",
    groups: ["Field"],
    items: [
      { to: "/admin/crm", label: "My route", icon: MapIcon, module: "route", group: "Field" },
      { to: "/admin/crm/jobs", label: "Jobs", icon: Wrench, module: "jobs", group: "Field" },
      { to: "/admin/crm/water-lab", label: "Water lab", icon: FlaskConical, module: "waterLab", group: "Field" },
      { to: "/admin/crm/inbox", label: "Text inbox", icon: MessagesSquare, module: "inbox", group: "Field" },
      { to: "/admin/crm/pay-per-pool", label: "My pay", icon: Wallet, module: "payPerPool", group: "Field" },
      { to: "/admin/crm/alerts", label: "Alerts", icon: AlertTriangle, module: "alerts", group: "Field" },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    blurb: "Setup, security and health",
    icon: SettingsIcon,
    home: "/admin/crm/settings",
    groups: ["Setup", "People", "Platform"],
    items: [
      { to: "/admin/crm/settings", label: "Settings", icon: SettingsIcon, module: "settings", group: "Setup" },
      { to: "/admin/crm/service-setup", label: "Service setup", icon: SlidersHorizontal, module: "serviceSetup", group: "Setup" },
      { to: "/admin/crm/automations", label: "Automations", icon: Workflow, module: "automations", group: "Setup" },
      { to: "/admin/crm/reports", label: "Reports", icon: BarChart3, module: "reports", group: "Setup" },
      { to: "/admin/team", label: "Team & access", icon: Users, module: "team", group: "People" },
      { to: "/admin/activity", label: "Activity log", icon: Activity, module: "activity", group: "People" },
      { to: "/admin/crm/security", label: "Security", icon: ShieldCheck, module: "security", group: "Platform" },
      { to: "/admin/crm/audit-trail", label: "Audit trail", icon: ScrollText, module: "security", group: "Platform" },
      { to: "/admin/crm/webhook-tester", label: "Webhook tester", icon: Activity, module: "security", group: "Platform" },
      { to: "/admin/crm/site-speed", label: "Site speed", icon: Gauge, module: "siteSpeed", group: "Platform" },
      { to: "/admin/crm/deploy-health", label: "Deploy health", icon: Activity, module: "deployHealth", group: "Platform" },
      { to: "/admin/crm/app", label: "Operations console", icon: LayoutDashboard, module: "console", group: "Platform" },
    ],
  },
];

const WORKSPACE_BY_KEY = new Map(WORKSPACES.map((w) => [w.key, w]));

export function getWorkspace(key: WorkspaceKey | null | undefined): Workspace {
  return (key && WORKSPACE_BY_KEY.get(key)) || WORKSPACES[0]!;
}

/** Which workspace best claims a pathname (used when someone deep-links). */
export function workspaceForPath(pathname: string): WorkspaceKey | null {
  let best: { len: number; key: WorkspaceKey } | null = null;
  for (const ws of WORKSPACES) {
    for (const item of ws.items) {
      const match = pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (match && (!best || item.to.length > best.len)) best = { len: item.to.length, key: ws.key };
    }
  }
  return best?.key ?? null;
}
