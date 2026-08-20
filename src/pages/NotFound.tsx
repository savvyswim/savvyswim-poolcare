import { useLocation } from "@/lib/router-compat";
import { useEffect, useRef } from "react";
import Seo from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();
  const reported = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    console.error("404 Error: User attempted to access non-existent route:", path);
    // Log every miss so the office sees broken links on /admin/not-found.
    if (reported.current === path) return;
    reported.current = path;
    void import("@/lib/not-found-log.functions")
      .then(({ logNotFound }) =>
        logNotFound({
          data: {
            path: path.slice(0, 300),
            fullUrl: window.location.href.slice(0, 600),
            referrer: document.referrer ? document.referrer.slice(0, 600) : null,
          },
        }),
      )
      .catch(() => undefined);
  }, [location.pathname]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Seo
        title="Page Not Found | Savvy Swim"
        description="This Savvy Swim page doesn't exist. Head back home for pool cleaning, equipment repair, and weekly service across North Texas."
        path={location.pathname}
        noindex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
