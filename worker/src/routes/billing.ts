import { adminDb } from "../lib/supabase";
import { error, json } from "../lib/http";
import { body } from "../lib/http";
import { createCheckout, createPortal, verifyStripeSignature } from "../lib/stripe";
import type { Env } from "../types";
import type { AuthUser } from "../lib/auth";

export async function checkout(env: Env, user: AuthUser, request: Request): Promise<Response> {
  const input = await body<{ interval?: string }>(request);
  const interval = input.interval === "yearly" ? "yearly" : "monthly";
  try {
    return json({ url: await createCheckout(env, user, interval) });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Checkout unavailable", 502);
  }
}

export async function portal(env: Env, user: AuthUser): Promise<Response> {
  try {
    return json({ url: await createPortal(env, user) });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Billing portal unavailable", 502);
  }
}

interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

export async function webhook(env: Env, request: Request): Promise<Response> {
  const raw = await request.text();
  const signature = request.headers.get("Stripe-Signature") ?? "";
  if (!(await verifyStripeSignature(env, raw, signature))) return error("Invalid signature", 400);

  let event: StripeEvent;
  try { event = JSON.parse(raw) as StripeEvent; }
  catch { return error("Invalid payload", 400); }

  const db = adminDb(env);
  const obj = event.data.object;
  const customerId = typeof obj.customer === "string" ? obj.customer : null;

  if (event.type === "checkout.session.completed") {
    const userId = (obj.metadata as Record<string, string> | null)?.user_id ?? (obj.client_reference_id as string | null);
    if (userId) {
      await db.from("profiles").update({
        plan: "pro",
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      }).eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    if (!customerId) return json({ received: true });
    const active = ["active", "trialing"].includes(String(obj.status));
    await db.from("profiles").update({ plan: active ? "pro" : "free" }).eq("stripe_customer_id", customerId);
  }

  if (event.type === "invoice.payment_failed" && customerId) {
    await db.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", customerId);
  }

  return json({ received: true });
}
