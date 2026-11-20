import { adminDb, userDb } from "../lib/supabase";
import { json, error } from "../lib/http";
import { PLANS } from "../lib/plans";
import { wrapAffiliateUrl } from "../lib/affiliate";
import { getPushMessage } from "../lib/push";
import type { Env } from "../types";
import type { AuthUser } from "../lib/auth";
import type { Deal, PlanTier, ProductWithRetailer, Retailer } from "../lib/database.types";

export function config(env: Env): Response {
  return json({ vapidPublicKey: env.VAPID_PUBLIC_KEY || "" });
}

export async function me(env: Env, user: AuthUser): Promise<Response> {
  const db = userDb(env, user.token);
  const { data } = await db.from("profiles").select("plan, email").eq("id", user.id).maybeSingle();
  return json({ email: data?.email ?? user.email ?? "", plan: data?.plan ?? "free" });
}

export async function retailers(env: Env, url: URL): Promise<Response> {
  const db = adminDb(env);
  const category = url.searchParams.get("category");
  let query = db.from("retailers").select("*").eq("is_active", true).order("name");
  if (category && category !== "All") query = query.eq("category", category);
  const [{ data, error: err }, { data: products }] = await Promise.all([query, db.from("products").select("retailer_id")]);
  if (err) return error(err.message, 500);

  const counts = new Map<string, number>();
  for (const row of products ?? []) counts.set(row.retailer_id, (counts.get(row.retailer_id) ?? 0) + 1);
  return json({
    retailers: (data ?? []).map((r: Retailer) => ({ ...r, product_count: counts.get(r.id) ?? 0 })),
  });
}

export async function deals(env: Env, url: URL, user: AuthUser | null): Promise<Response> {
  const db = adminDb(env);
  let plan: PlanTier = "free";
  if (user) {
    const { data: profile } = await userDb(env, user.token).from("profiles").select("plan").eq("id", user.id).maybeSingle();
    if (profile?.plan === "pro") plan = "pro";
  }

  const category = url.searchParams.get("category");
  const retailerId = url.searchParams.get("retailer");
  const minDiscount = Number(url.searchParams.get("minDiscount") ?? 0);

  let query = db.from("products").select("*, retailers(*)")
    .gte("discount_pct", Math.max(15, minDiscount))
    .eq("in_stock", true)
    .order("discount_pct", { ascending: false })
    .order("watcher_count", { ascending: false })
    .limit(60);
  if (category && category !== "All") query = query.eq("category", category);
  if (retailerId && retailerId !== "all") query = query.eq("retailer_id", retailerId);
  const delay = PLANS[plan].feedDelayMinutes;
  if (delay > 0) query = query.lte("last_checked_at", new Date(Date.now() - delay * 60_000).toISOString());

  const { data, error: err } = await query;
  if (err) return error(err.message, 500);
  const products = (data ?? []) as unknown as ProductWithRetailer[];

  const gtins = [...new Set(products.map((p) => p.gtin_ean).filter(Boolean))] as string[];
  const cheapest = new Map<string, { price: number; retailer: string }>();
  if (gtins.length) {
    const { data: matches } = await db.from("products")
      .select("gtin_ean, current_price, retailers(name)")
      .in("gtin_ean", gtins);
    for (const row of (matches ?? []) as unknown as { gtin_ean: string | null; current_price: number | null; retailers: { name: string } | null }[]) {
      if (!row.gtin_ean || row.current_price === null) continue;
      const current = cheapest.get(row.gtin_ean);
      const name = row.retailers?.name ?? "another store";
      if (!current || row.current_price < current.price) cheapest.set(row.gtin_ean, { price: row.current_price, retailer: name });
    }
  }

  const deals: Deal[] = products.map((product) => {
    const best = product.gtin_ean ? cheapest.get(product.gtin_ean) : undefined;
    return {
      ...product,
      cheapest_price: best?.price ?? null,
      cheapest_retailer: best && product.current_price !== null && best.price < product.current_price ? best.retailer : null,
      is_live: Boolean(product.last_checked_at && Date.now() - new Date(product.last_checked_at).getTime() < 30 * 60_000),
      accessible: plan === "pro",
    };
  });
  return json({ deals, plan, delayMinutes: delay });
}

export async function compare(env: Env, url: URL, user: AuthUser): Promise<Response> {
  const { data: profile } = await userDb(env, user.token).from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profile?.plan !== "pro") return json({ error: "Cross-store comparison is a Pro feature.", upgrade: true }, 403);

  const gtin = url.searchParams.get("gtin");
  if (!gtin) return error("gtin is required", 400);
  const { data, error: err } = await adminDb(env).from("products").select("*, retailers(*)")
    .eq("gtin_ean", gtin).order("current_price", { ascending: true });
  if (err) return error(err.message, 500);

  const products = (data ?? []) as unknown as ProductWithRetailer[];
  return json({
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      current_price: p.current_price,
      in_stock: p.in_stock,
      retailer: p.retailers.name,
      domain: p.retailers.domain,
      url: wrapAffiliateUrl(p.retailers.affiliate_template, p.normalized_url, p.gtin_ean),
    })),
  });
}

export async function history(env: Env, url: URL, user: AuthUser): Promise<Response> {
  const db = userDb(env, user.token);
  const { data: profile } = await db.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  if (profile?.plan !== "pro") return json({ error: "Price history is a Pro feature.", upgrade: true }, 403);

  const productId = url.searchParams.get("productId");
  if (!productId) return error("productId is required", 400);
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error: err } = await db.from("price_history")
    .select("price, in_stock, recorded_at")
    .eq("product_id", productId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });
  if (err) return error(err.message, 500);
  return json({ history: data ?? [] });
}

export async function pushMessage(env: Env, url: URL): Promise<Response> {
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) return error("endpoint is required", 400);
  const message = await getPushMessage(env, endpoint);
  return json(message ?? { title: "SnipeTag", body: "A snipe just triggered.", url: "./alerts" });
}
