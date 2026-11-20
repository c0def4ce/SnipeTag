import type { Env } from "../types";

export function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // Always permit same-origin calls so the Worker can also host the static site.
  const ownOrigin = new URL(request.url).origin;
  const list = [...new Set([...allowed, ownOrigin])];
  const allow = origin && (list.length === 0 || list.includes(origin)) ? origin : (list[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export function error(message: string, status = 500, headers: HeadersInit = {}): Response {
  return json({ error: message }, status, headers);
}

export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  try { return await request.json() as T; }
  catch { return {} as T; }
}
