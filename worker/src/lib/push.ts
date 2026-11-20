import type { Env } from "../types";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

function concat(...arrays: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBufferLike> {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function derInteger(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  let value: Uint8Array<ArrayBufferLike> = bytes.slice(start);
  if (value[0] & 0x80) value = concat(new Uint8Array([0]), value);
  return concat(new Uint8Array([0x02, value.length]), value);
}

/** Web Crypto returns raw r||s; JOSE needs ASN.1 DER. */
function rawSignatureToDer(raw: Uint8Array): Uint8Array {
  const r = derInteger(raw.slice(0, 32));
  const s = derInteger(raw.slice(32));
  return concat(new Uint8Array([0x30, r.length + s.length]), r, s);
}

async function vapidAuthorization(audience: string, env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || "mailto:alerts@snipetag.app",
  })));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    fromB64url(env.VAPID_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  ));
  return `vapid t=${signingInput}.${b64url(rawSignatureToDer(signature))},k=${env.VAPID_PUBLIC_KEY}`;
}

/**
 * Send a push with no encrypted payload. The service worker fetches the message
 * from PUSH_KV using its subscription endpoint, which avoids sending secrets
 * through the push service.
 */
export async function sendPush(env: Env, endpoint: string, message: PushMessage): Promise<void> {
  await env.PUSH_KV.put(
    `pushmsg:${encodeURIComponent(endpoint)}`,
    JSON.stringify(message),
    { expirationTtl: 60 * 60 },
  );

  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return;
  const audience = new URL(endpoint).origin;
  const authorization = await vapidAuthorization(audience, env);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      TTL: "86400",
      Urgency: "high",
    },
  });
  if (!response.ok && response.status !== 201 && response.status !== 202) {
    throw new Error(`Push service returned ${response.status}`);
  }
}

export async function getPushMessage(env: Env, endpoint: string): Promise<PushMessage | null> {
  const raw = await env.PUSH_KV.get(`pushmsg:${encodeURIComponent(endpoint)}`);
  return raw ? JSON.parse(raw) as PushMessage : null;
}
