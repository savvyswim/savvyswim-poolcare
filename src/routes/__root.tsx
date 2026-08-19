/// <reference types="vite/client" />
import { lazy, Suspense, useEffect } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PerfMonitor } from "@/components/PerfMonitor";
import { CallOptionsCard } from "@/components/CallButton";

// Consent bar is post-hydration only — keep it out of the first payload.
const ConsentBanner = lazy(() => import("@/components/ConsentBanner"));
// On-site lead capture — the form itself only downloads on the first CTA click.
const QuoteModal = lazy(() => import("@/components/QuoteModalHost"));

// Toast portals render nothing until something is toasted — load them after paint.
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));

// Free water test side tab.
const WaterTestTab = lazy(() => import("@/components/WaterTestTab"));





import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const SITE_TITLE = "Savvy Swim — Pool Cleaning, Service & Repair in Texas";
const SITE_DESCRIPTION =
  "Weekly pool cleaning, equipment repair, and service across Texas. Certified techs, photo reports every visit. Free quote.";
const OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/7GbNeRz73ROCzqUdADLL8vqrNGq2/social-images/social-1785866500939-social-image.webp";

const SITE_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://savvyswimservices.com/#organization",
      name: "Savvy Swim",
      url: "https://savvyswimservices.com/",
      logo: "https://savvyswimservices.com/apple-touch-icon.png",
      email: "hi@savvyswim.com",
      telephone: "+1-817-663-7665",
    },
    {
      "@type": "WebSite",
      "@id": "https://savvyswimservices.com/#website",
      url: "https://savvyswimservices.com/",
      name: "Savvy Swim",
      publisher: { "@id": "https://savvyswimservices.com/#organization" },
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
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [{ type: "application/ld+json", children: SITE_JSONLD }],

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
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <ScrollToTop />
          <PerfMonitor />

          <Outlet />

          <CallOptionsCard />

          <Suspense fallback={null}>
            <Toaster />
            <Sonner />
            <QuoteModal />
            <WaterTestTab />
            <ConsentBanner />
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
