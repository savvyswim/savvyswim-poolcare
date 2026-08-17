import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Platform routes (email webhooks/previews, MCP) authenticate themselves.
  if (new URL(request.url).pathname.startsWith("/lovable/")) return next();
  try {

    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    try {
      const { reportServerError } = await import("./lib/server-error-monitor");
      await reportServerError({ error, source: "middleware", statusCode: 500 });
    } catch {
      // monitoring must never break the response
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});


export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
