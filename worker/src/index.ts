import { getUser } from "./lib/auth";
import { runCron } from "./lib/cron";
import { corsHeaders, error, json } from "./lib/http";
import * as publicRoutes from "./routes/public";
import * as snipeRoutes from "./routes/snipes";
import * as pushRoutes from "./routes/push";
import * as billingRoutes from "./routes/billing";
import { cronEndpoint } from "./routes/cron";
import type { ExecutionContext, ScheduledController } from "@cloudflare/workers-types";
import type { Env } from "./types";

async function serveAsset(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) {
    return new Response("SnipeTag API is running. Build web/ and bind the assets directory to serve the site.", {
      headers: { "Content-Type": "text/plain" },
    });
  }
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return response;
  const indexUrl = new URL("/index.html", request.url);
  return env.ASSETS.fetch(new Request(indexUrl, request));
}

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/";
  const method = request.method;

  if (!path.startsWith("/api/")) return serveAsset(request, env);

  // Public endpoints
  if (path === "/api/config" && method === "GET") return publicRoutes.config(env);
  if (path === "/api/push/message" && method === "GET") return publicRoutes.pushMessage(env, url);
  if (path === "/api/retailers" && method === "GET") return publicRoutes.retailers(env, url);
  if (path === "/api/deals" && method === "GET") return publicRoutes.deals(env, url, await getUser(request, env));
  if (path === "/api/cron/check-prices" && method === "GET") return cronEndpoint(env, request);
  if (path === "/api/stripe/webhook" && method === "POST") return billingRoutes.webhook(env, request);

  // Everything below requires a valid Supabase access token.
  const user = await getUser(request, env);
  if (!user) return error("Unauthorized", 401);

  if (path === "/api/me" && method === "GET") return publicRoutes.me(env, user);
  if (path === "/api/compare" && method === "GET") return publicRoutes.compare(env, url, user);
  if (path === "/api/history" && method === "GET") return publicRoutes.history(env, url, user);

  if (path === "/api/extract" && method === "POST") return snipeRoutes.extract(env, user, request);

  if (path === "/api/snipes" && method === "GET") return snipeRoutes.listSnipes(env, user);
  if (path === "/api/snipes" && method === "POST") return snipeRoutes.createSnipe(env, user, request);

  const snipeMatch = /^\/api\/snipes\/([0-9a-f-]+)$/i.exec(path);
  if (snipeMatch) {
    if (method === "PATCH") return snipeRoutes.updateSnipe(env, user, snipeMatch[1], request);
    if (method === "DELETE") return snipeRoutes.deleteSnipe(env, user, snipeMatch[1]);
  }

  if (path === "/api/push/subscribe" && method === "POST") return pushRoutes.subscribe(env, user, request);
  if (path === "/api/push/subscribe" && method === "DELETE") return pushRoutes.unsubscribe(env, user);

  if (path === "/api/stripe/checkout" && method === "POST") return billingRoutes.checkout(env, user, request);
  if (path === "/api/stripe/portal" && method === "POST") return billingRoutes.portal(env, user);

  return error("Not found", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    let response: Response;
    try {
      response = await route(request, env, new URL(request.url));
    } catch (err) {
      console.error("[worker] unhandled error", err);
      response = error(err instanceof Error ? err.message : "Internal error", 500);
    }

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, String(value));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runCron(env).catch((err) => console.error("[cron] failed", err)),
    );
  },
};
