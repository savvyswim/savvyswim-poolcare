/// <reference types="vite/client" />
import { Suspense, useEffect } from "react";
import { lazyWithReload } from "@/lib/lazy-retry";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  useRouterState,

  type ErrorComponentProps,
} from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PerfMonitor } from "@/components/PerfMonitor";
import { CallOptionsCard } from "@/components/CallButton";

// Consent bar is post-hydration only. Keep it out of the first payload.
const ConsentBanner = lazyWithReload(() => import("@/components/ConsentBanner"));
// On-site lead capture. The form itself only downloads on the first CTA click.
const QuoteModal = lazyWithReload(() => import("@/components/QuoteModalHost"));

// Toast portals render nothing until something is toasted, load them after paint.
const Sonner = lazyWithReload(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
);
const Toaster = lazyWithReload(() =>
  import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })),
);

// New-customer offer card, shown once per visit on public pages.
const SwimClubPromptHost = lazyWithReload(() => import("@/components/SwimClubPromptHost"));

// Free water test side tab.
const WaterTestTab = lazyWithReload(() => import("@/components/WaterTestTab"));

// Meta (Facebook / Instagram) pixel, only after the visitor accepts cookies.
const MetaPixel = lazyWithReload(() => import("@/components/MetaPixel"));
const PageViewTracker = lazyWithReload(() => import("@/components/PageViewTracker"));





import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const SITE_TITLE = "Savvy Swim | Pool Cleaning, Service & Repair in Texas";
const SITE_DESCRIPTION =
  "Weekly pool cleaning, equipment repair, and service across Texas. Certified techs, photo reports every visit. Free quote.";
// Share preview, served from our own domain so nothing outside Savvy Swim
// appears when a link is posted.
const OG_IMAGE = "https://savvyswim.com/og-image.jpg";

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700;800&family=Caveat:wght@600&family=IBM+Plex+Mono:wght@400;500&display=swap";

// Fallback for browsers that ignore the link onLoad attribute, and for the
// case where the sheet is already cached when the script runs.
const FONT_SWAP_SCRIPT =
  "(function(){var l=document.querySelector('link[data-font-sheet]');if(!l)return;var s=function(){l.media='all'};if(l.sheet)s();else l.addEventListener('load',s,{once:true});addEventListener('load',s,{once:true})})();";

const SITE_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://savvyswim.com/#organization",
      name: "Savvy Swim",
      url: "https://savvyswim.com/",
      logo: "https://savvyswim.com/apple-touch-icon.png",
      email: "hi@savvyswim.com",
      telephone: "+1-817-663-7665",
    },
    {
      "@type": "WebSite",
      "@id": "https://savvyswim.com/#website",
      url: "https://savvyswim.com/",
      name: "Savvy Swim",
      publisher: { "@id": "https://savvyswim.com/#organization" },
    },
  ],
});

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
      // Stops iOS/Safari from auto-linking phone numbers, which breaks hydration.
      { name: "format-detection", content: "telephone=no" },
      { name: "theme-color", content: "#06141c" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Savvy Swim" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "application-name", content: "Savvy Swim" },
      // Search Console ownership: legacy savvyswim.com property + the primary domain.
      { name: "google-site-verification", content: "gG7n9rWUtSYPZ63aEOvuErjGt8T79b1dLm8JuZdzk0s" },
      { name: "google-site-verification", content: "2FRszHPuGg1y3-bG0fWEVl2AyvPaiW9eYkFHRDDJRlw" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png?v=3", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://savvyswim.app" },
      // Fonts must never hold up the first paint: fetch them as a low priority
      // sheet, then a tiny inline script promotes them to screen styles.
      {
        rel: "stylesheet",
        href: FONT_CSS,
        media: "print",
        "data-font-sheet": "1",
      },

    ],
    scripts: [
      { type: "application/ld+json", children: SITE_JSONLD },
      { children: FONT_SWAP_SCRIPT },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const href = useRouterState({ select: (s) => s.location.href });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Ad landing page and survey stay bare: no popups, no cookie bar, no tabs.
  const isBareRoute = pathname === "/offer" || pathname === "/survey";
  // Keep the marketing offer off staff/customer tooling.
  const showOffer = !isBareRoute && !/^\/(admin|portal|app|auth)(\/|$)/.test(pathname);

  // First-touch campaign capture (utm_*, ?src= codes, gclid/fbclid) so every
  // lead attributes back to the campaign that produced it.
  useEffect(() => {
    void import("@/lib/lead-attribution").then((m) => m.captureAttribution());
  }, [href]);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <ScrollToTop />
          <PerfMonitor />


          {/* Soft fade and lift on every page change, skipped when the
              visitor prefers reduced motion. */}
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>


          <CallOptionsCard />

          <Suspense fallback={null}>
            <Toaster />
            <Sonner />
            {!isBareRoute && <QuoteModal />}
            {pathname !== "/" && pathname !== "/survey" && pathname !== "/thank-you" && !isBareRoute && <WaterTestTab />}
            {!isBareRoute && <ConsentBanner />}
            <MetaPixel />
            <PageViewTracker />
            {showOffer && <SwimClubPromptHost />}
          </Suspense>


        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">This page didn't load</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong while loading this page. You can try again or head back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
