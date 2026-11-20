import { userDb } from "../lib/supabase";
import { body, error, json } from "../lib/http";
import type { Env } from "../types";
import type { AuthUser } from "../lib/auth";

export async function subscribe(env: Env, user: AuthUser, request: Request): Promise<Response> {
  const input = await body<{ subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } }>(request);
  const sub = input.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return error("Invalid push subscription", 400);

  const { error: err } = await userDb(env, user.token).from("profiles").update({
    push_subscription: {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    },
  }).eq("id", user.id);
  if (err) return error(err.message, 500);

  await env.PUSH_KV.put(`pushsub:${encodeURIComponent(sub.endpoint)}`, user.id);
  return json({ ok: true });
}

export async function unsubscribe(env: Env, user: AuthUser): Promise<Response> {
  const db = userDb(env, user.token);
  const { data: profile } = await db.from("profiles").select("push_subscription").eq("id", user.id).maybeSingle();
  const endpoint = (profile?.push_subscription as { endpoint?: string } | null)?.endpoint;
  if (endpoint) await env.PUSH_KV.delete(`pushsub:${encodeURIComponent(endpoint)}`);

  const { error: err } = await db.from("profiles").update({ push_subscription: null }).eq("id", user.id);
  if (err) return error(err.message, 500);
  return json({ ok: true });
}
