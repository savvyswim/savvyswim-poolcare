import { Link } from "@tanstack/react-router";
import { CRM_BASE_URL, portalUrl, staffLoginUrl } from "@/lib/app-links";

/**
 * Friendly "this moved" page for legacy CRM paths that used to live on the
 * marketing site (/app, /admin/crm). Returns a real page instead of a 404 and
 * points staff and customers at the right destination.
 */
export function MovedToApp({ from }: { from: string }) {
  return (
    <main className="min-h-[70vh] bg-background px-6 py-20">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 border border-border bg-card p-8 md:p-12">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            410 · Moved · {from}
          </p>
          <h1 className="font-display text-3xl uppercase leading-tight md:text-4xl">
            The Savvy Swim CRM lives in its own app now
          </h1>
          <p className="text-base text-muted-foreground">
            This address used to open the staff CRM on the marketing site. Everything
            transactional — routes, visits, invoices, the customer portal — moved to{" "}
            <span className="font-mono">{CRM_BASE_URL.replace(/^https?:\/\//, "")}</span>. Your
            login is the same.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={staffLoginUrl()}
            className="border border-primary bg-primary px-5 py-4 text-center font-display text-sm uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            Staff sign in
          </a>
          <a
            href={portalUrl()}
            className="border border-border px-5 py-4 text-center font-display text-sm uppercase tracking-wide transition-colors hover:bg-muted"
          >
            Customer portal
          </a>
        </div>

        <div className="border-t border-border pt-6">
          <p className="mb-3 text-sm text-muted-foreground">
            Looking to book a pool visit or a free inspection?
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/schedule"
              search={(prev) => ({ ...prev, src: "legacy-crm-link" })}
              className="border border-border px-5 py-3 font-display text-sm uppercase tracking-wide transition-colors hover:bg-muted"
            >
              Schedule an inspection
            </Link>
            <Link
              to="/"
              className="px-5 py-3 font-display text-sm uppercase tracking-wide text-muted-foreground underline underline-offset-4"
            >
              Back to savvyswim.com
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
