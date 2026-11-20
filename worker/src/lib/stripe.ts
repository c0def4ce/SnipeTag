import { adminDb } from "./supabase";
import type { Env } from "../types";
import type { AuthUser } from "./auth";

async function stripePost(env: Env, path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await response.json() as Record<string, unknown> & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Stripe error ${response.status}`);
  return data;
}

export async function ensureCustomer(env: Env, user: AuthUser): Promise<string> {
  const db = adminDb(env);
  const { data: profile } = await db.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const params = new URLSearchParams({ email: user.email ?? "" });
  params.set("metadata[user_id]", user.id);
  const customer = await stripePost(env, "customers", params);
  const customerId = String(customer.id);
  await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  return customerId;
}

export async function createCheckout(env: Env, user: AuthUser, interval: "monthly" | "yearly"): Promise<string> {
  const customer = await ensureCustomer(env, user);
  const price = interval === "yearly" ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
  const appUrl = (env.SITE_URL ?? env.APP_URL ?? "").replace(/\/$/, "");
  const params = new URLSearchParams({
    mode: "subscription",
    customer,
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancelled`,
    "subscription_data[trial_period_days]": "3",
    "subscription_data[metadata][user_id]": user.id,
    "metadata[user_id]": user.id,
  });
  const session = await stripePost(env, "checkout/sessions", params);
  return String(session.url);
}

export async function createPortal(env: Env, user: AuthUser): Promise<string> {
  const customer = await ensureCustomer(env, user);
  const appUrl = (env.SITE_URL ?? env.APP_URL ?? "").replace(/\/$/, "");
  const session = await stripePost(env, "billing_portal/sessions", new URLSearchParams({
    customer,
    return_url: `${appUrl}/billing`,
  }));
  return String(session.url);
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature(env: Env, raw: string, header: string): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const index = p.indexOf("=");
      return [p.slice(0, index).trim(), p.slice(index + 1).trim()];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${raw}`),
  );
  const expected = hex(new Uint8Array(signed));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
