import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, context: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  serverEntryPromise ??= import("@tanstack/react-start/server-entry").then(
    (module) => (module.default ?? module) as ServerEntry,
  );
  return serverEntryPromise;
}

function isSwallowedServerError(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function monitor(error: unknown, request: Request, statusCode: number) {
  try {
    const { reportServerError } = await import("./lib/server-error-monitor");
    await reportServerError({ error, request, statusCode, source: "ssr" });
  } catch {
    // never block the response on monitoring
  }
}

async function normalizeServerResponse(response: Response, request: Request): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isSwallowedServerError(body)) return response;

  const captured = consumeLastCapturedError() ?? new Error(`SSR request failed: ${body}`);
  console.error(captured);
  await monitor(captured, request, response.status);
  return errorResponse();
}

function errorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: unknown, context: unknown): Promise<Response> {
    try {
      const serverEntry = await getServerEntry();
      const response = await serverEntry.fetch(request, env, context);
      return await normalizeServerResponse(response, request);
    } catch (error) {
      console.error(error);
      await monitor(error, request, 500);
      return errorResponse();
    }
  },
};
