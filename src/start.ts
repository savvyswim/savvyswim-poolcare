import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { verifyStartupHealth } from "./lib/startup-health";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";


const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Verify middleware dependencies before the server accepts traffic. This runs
// at module init, never throws, and records results for /api/public/health.
const startupHealth = verifyStartupHealth({
  createStart,
  createMiddleware,
  attachSupabaseAuth,
  renderErrorPage,
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
