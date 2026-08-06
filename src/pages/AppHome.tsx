import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { ArrowRight, Droplets, LogOut, Route as RouteIcon, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSavvyIdentity } from "@/crm/lib/useSavvy";

type Door = {
  key: string;
  title: string;
  blurb: string;
  to: string;
  icon: typeof Droplets;
};

const CUSTOMER_DOOR: Door = {
  key: "customer",
  title: "My pool",
  blurb: "Visits, water reports, invoices and maintenance schedule.",
  to: "/portal",
  icon: Droplets,
};
const TECH_DOOR: Door = {
  key: "tech",
  title: "Today's route",
  blurb: "Your stops, visit sheets, checklists and photo reports.",
  to: "/admin/crm",
  icon: RouteIcon,
};
const ADMIN_DOOR: Door = {
  key: "admin",
  title: "Office & owner",
  blurb: "Customers, pipeline, jobs, finance and reporting.",
  to: "/admin/crm/customers",
  icon: ShieldCheck,
};

/** Minimal typing for the Chromium install prompt event. */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

export default function AppHome() {
  const { user, loading, signOut } = useAuth();
  const identity = useSavvyIdentity();
  const navigate = useNavigate();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/app", { replace: true });
  }, [loading, user, navigate]);

  const busy = loading || (!!user && identity.loading);

  const doors: Door[] = [];
  if (identity.isOffice) doors.push(ADMIN_DOOR, TECH_DOOR);
  else if (identity.isTech) doors.push(TECH_DOOR);
  if (identity.customerId || (!identity.level && !busy)) doors.push(CUSTOMER_DOOR);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-hairline">
        <div className="container-tight flex h-16 items-center justify-between gap-3 sm:h-[76px]">
          <span className="font-display text-[1.25rem] uppercase leading-none tracking-tight text-accent sm:text-[1.7rem]">
            Savvy Swim
          </span>
          {user && (
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 font-tech text-xs uppercase text-primary hover:border-primary"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
          )}
        </div>
      </header>

      <main className="container-tight py-10 sm:py-14">
        <p className="font-tech text-[11px] uppercase tracking-[0.22em] text-primary/50">savvyswim.app</p>
        <h1 className="mt-2 font-display text-3xl uppercase leading-none tracking-tight sm:text-5xl">
          Open your Savvy Swim
        </h1>
        <p className="mt-3 max-w-xl font-tech text-sm text-primary/70">
          One app for customers, technicians and the office. Install it on your phone and it opens straight to your
          dashboard.
        </p>

        {busy && <p className="mt-8 font-tech text-sm text-primary/60">Loading your access…</p>}

        {!busy && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {doors.map((d) => (
              <Link
                key={d.key}
                to={d.to}
                className="group flex items-start justify-between gap-4 border border-hairline p-5 hover:border-accent"
              >
                <span className="min-w-0">
                  <d.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  <span className="mt-3 block font-display text-lg uppercase leading-tight">{d.title}</span>
                  <span className="mt-1 block font-tech text-xs text-primary/60">{d.blurb}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary/40 group-hover:text-accent" aria-hidden="true" />
              </Link>
            ))}
            {!doors.length && (
              <div className="border border-hairline p-5 sm:col-span-2">
                <p className="font-tech text-sm text-primary/70">
                  This account isn&rsquo;t linked to a pool or a crew yet. Call the office at{" "}
                  <a href="tel:+14697440379" className="text-accent underline-offset-4 hover:underline">
                    (469) 744-0379
                  </a>{" "}
                  and we&rsquo;ll connect it.
                </p>
              </div>
            )}
          </div>
        )}

        <section className="mt-10 border border-hairline p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-base uppercase leading-tight">
            <Smartphone className="h-4 w-4 text-accent" aria-hidden="true" /> Install on your phone
          </h2>
          {installed ? (
            <p className="mt-2 font-tech text-xs text-primary/60">Installed — you&rsquo;re running the app.</p>
          ) : (
            <>
              <p className="mt-2 font-tech text-xs text-primary/60">
                iPhone / iPad: tap Share, then <strong>Add to Home Screen</strong>. Android: tap the menu, then{" "}
                <strong>Install app</strong>.
              </p>
              {installEvent && (
                <button
                  type="button"
                  onClick={() => void installEvent.prompt()}
                  className="mt-3 inline-flex items-center gap-2 border border-accent bg-accent/10 px-4 py-2 font-tech text-xs uppercase tracking-wide text-accent"
                >
                  Install Savvy Swim
                </button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
