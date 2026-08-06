import type { SsLevel } from "@/crm/lib/useSavvy";

/** Every access-controlled module in the admin portal. */
export type ModuleKey =
  | "route"
  | "customers"
  | "pipeline"
  | "jobs"
  | "alerts"
  | "technicians"
  | "products"
  | "servicePlans"

  | "finance"
  | "trucks"
  | "inventory"
  | "email"
  | "reports"
  | "connect"
  | "reviews"
  | "scorecard"
  | "settings"
  | "console"
  | "cleaning"
  | "store"
  | "team"
  | "activity"
  | "projects"
  | "security"
  | "designs";


const ALL: SsLevel[] = ["owner", "office_manager", "technician", "contractor"];
const OFFICE: SsLevel[] = ["owner", "office_manager"];
const OWNER: SsLevel[] = ["owner"];

/** Which staff levels may open each module. */
export const MODULE_ACCESS: Record<ModuleKey, SsLevel[]> = {
  route: ALL,
  jobs: ALL,
  alerts: ALL,
  customers: OFFICE,
  pipeline: OFFICE,
  technicians: OFFICE,
  products: OFFICE,
  servicePlans: OFFICE,
  trucks: OFFICE,
  inventory: OFFICE,
  email: OFFICE,
  reports: OFFICE,
  connect: OFFICE,
  reviews: OFFICE,
  scorecard: OFFICE,
  settings: OFFICE,
  // Owner plus any office manager the owner assigns runs the books.
  finance: OFFICE,
  projects: OFFICE,
  security: OWNER,
  console: OWNER,

  cleaning: OWNER,
  store: OWNER,
  team: OWNER,
  activity: OWNER,
  designs: OWNER,
};

/** Route path -> module. Longest match wins. */
export const PATH_MODULE: Record<string, ModuleKey> = {
  "/admin/crm": "route",
  "/admin/crm/customers": "customers",
  "/admin/crm/pipeline": "pipeline",
  "/admin/crm/jobs": "jobs",
  "/admin/crm/alerts": "alerts",
  "/admin/crm/technicians": "technicians",
  "/admin/crm/products": "products",
  "/admin/crm/service-plans": "servicePlans",
  "/admin/crm/finance": "finance",
  "/admin/crm/projects": "projects",
  "/admin/crm/trucks": "trucks",
  "/admin/crm/inventory": "inventory",
  "/admin/crm/email": "email",
  "/admin/crm/reports": "reports",
  "/admin/crm/connect": "connect",
  "/admin/crm/reviews": "reviews",
  "/admin/crm/scorecard": "scorecard",
  "/admin/crm/settings": "settings",
  "/admin/crm/security": "security",
  "/admin/crm/app": "console",

  "/admin/cleaning": "cleaning",
  "/admin/store": "store",
  "/admin/team": "team",
  "/admin/activity": "activity",
  "/admin/designs": "designs",
};

export function canAccess(level: SsLevel | null, mod: ModuleKey): boolean {
  if (!level) return false;
  return MODULE_ACCESS[mod].includes(level);
}

export function moduleForPath(pathname: string): ModuleKey | null {
  let best: { path: string; mod: ModuleKey } | null = null;
  for (const [path, mod] of Object.entries(PATH_MODULE)) {
    const match = pathname === path || pathname.startsWith(`${path}/`);
    if (match && (!best || path.length > best.path.length)) best = { path, mod };
  }
  return best?.mod ?? null;
}

export function canAccessPath(level: SsLevel | null, pathname: string): boolean {
  const mod = moduleForPath(pathname);
  return mod ? canAccess(level, mod) : !!level;
}
