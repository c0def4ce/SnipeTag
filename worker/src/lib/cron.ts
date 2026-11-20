import { adminDb } from "./supabase";
import { fetchAndExtract } from "./fetch-product";
import { catalogCheckMinutes, PLANS } from "./plans";
import { sendPush, type PushMessage } from "./push";
import type { Env } from "../types";
import type { PlanTier, Product, ProductWithRetailer, SnipeWithProduct } from "./database.types";

type ActiveSnipe = SnipeWithProduct & { profiles: { plan: PlanTier } | null };

async function notify(env: Env, snipe: ActiveSnipe, reason: "price_drop" | "restock"): Promise<void> {
  const product: ProductWithRetailer = snipe.products;
  const price = product.current_price?.toFixed(2) ?? "—";
  const message: PushMessage = {
    title: reason === "restock" ? `Restock: ${product.title}` : `Price drop: ${product.title}`,
    body: reason === "restock"
      ? `Back in stock at ${product.retailers.name} for £${price}.`
      : `Now £${price} at ${product.retailers.name} — your target hit.`,
    url: `${(env.SITE_URL ?? env.APP_URL ?? "").replace(/\/$/, "")}/alerts?snipe=${snipe.id}`,
  };

  const db = adminDb(env);
  const { data: profile } = await db.from("profiles")
    .select("push_subscription, email")
    .eq("id", snipe.user_id)
    .maybeSingle();

  const endpoint = (profile?.push_subscription as { endpoint?: string } | null)?.endpoint;
  if (endpoint) {
    try { await sendPush(env, endpoint, message); }
    catch (err) { console.error("[push] failed", err); }
  }

  if (env.RESEND_API_KEY && profile?.email) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.ALERTS_FROM_EMAIL || "SnipeTag <alerts@snipetag.app>",
          to: profile.email,
          subject: message.title,
          html: `<h2>${message.title}</h2><p>${message.body}</p>`,
        }),
      });
    } catch (err) { console.error("[email] failed", err); }
  }
}

/** Tiered priority worker: Pro/high-demand every 5 min, catalog 1–6 hours. */
export async function runCron(env: Env) {
  const db = adminDb(env);
  const [{ data: snipes, error: snipeError }, { data: products, error: productError }] = await Promise.all([
    db.from("snipes").select("*, products(*, retailers(*)), profiles(plan)").eq("status", "active"),
    db.from("products").select("*"),
  ]);
  if (snipeError || productError) throw snipeError ?? productError;

  const now = Date.now();
  const active = (snipes ?? []) as unknown as ActiveSnipe[];
  const proWatched = new Set(active.filter((s) => s.profiles?.plan === "pro").map((s) => s.product_id));

  const due = (products ?? []).filter((product: Product) => {
    const priority = proWatched.has(product.id) || product.check_priority >= 5;
    const interval = priority ? PLANS.pro.checkIntervalMinutes : catalogCheckMinutes(product.check_priority);
    const last = product.last_checked_at ? new Date(product.last_checked_at).getTime() : 0;
    return now - last >= interval * 60_000;
  });

  let checked = 0;
  let triggered = 0;
  const failures: string[] = [];

  for (const product of due) {
    try {
      const extracted = await fetchAndExtract(product.normalized_url);
      const previousPrice = product.current_price;
      const previousInStock = product.in_stock;
      const newPrice = extracted.price;
      const lowestEver = newPrice !== null && (product.lowest_ever_price === null || newPrice < product.lowest_ever_price)
        ? newPrice : product.lowest_ever_price;
      const base = previousPrice ?? product.previous_price ?? newPrice;
      const discountPct = newPrice !== null && base && base > 0
        ? Math.max(0, ((base - newPrice) / base) * 100) : product.discount_pct;

      await db.from("price_history").insert({
        product_id: product.id,
        price: newPrice,
        in_stock: extracted.inStock,
      });
      await db.from("products").update({
        title: extracted.title || product.title,
        image_url: extracted.imageUrl ?? product.image_url,
        gtin_ean: extracted.gtinEan ?? product.gtin_ean,
        current_price: newPrice,
        previous_price: previousPrice,
        lowest_ever_price: lowestEver,
        discount_pct: Math.round(discountPct * 100) / 100,
        currency: extracted.currency,
        in_stock: extracted.inStock,
        last_checked_at: new Date().toISOString(),
      }).eq("id", product.id);
      checked++;

      for (const snipe of active.filter((s) => s.product_id === product.id)) {
        const priceHit = snipe.target_price !== null && newPrice !== null && newPrice <= Number(snipe.target_price);
        const restockHit = snipe.alert_on_restock && !previousInStock && extracted.inStock;
        if (!priceHit && !restockHit) continue;
        await notify(env, snipe, priceHit ? "price_drop" : "restock");
        triggered++;
        if (priceHit) {
          await db.from("snipes").update({ status: "triggered" }).eq("id", snipe.id).eq("status", "active");
        }
      }
    } catch (err) {
      failures.push(product.normalized_url);
      console.error("[cron] failed", product.normalized_url, err);
      await db.from("products").update({ last_checked_at: new Date().toISOString() }).eq("id", product.id);
    }
  }

  return { ok: true, due: due.length, checked, triggered, failures, proWatched: proWatched.size };
}
