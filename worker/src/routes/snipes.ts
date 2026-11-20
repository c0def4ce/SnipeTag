import { adminDb, userDb } from "../lib/supabase";
import { body, error, json } from "../lib/http";
import { PLANS } from "../lib/plans";
import { normalizeProductUrl } from "../lib/extract";
import { fetchAndExtract } from "../lib/fetch-product";
import { ingestProduct, resolveRetailer } from "../lib/ingest";
import { wrapAffiliateUrl } from "../lib/affiliate";
import type { Env } from "../types";
import type { AuthUser } from "../lib/auth";
import type { SnipeStatus } from "../lib/database.types";

export async function listSnipes(env: Env, user: AuthUser): Promise<Response> {
  const { data, error: err } = await userDb(env, user.token).from("snipes")
    .select("*, products(*, retailers(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (err) return error(err.message, 500);
  return json({ snipes: data ?? [] });
}

export async function createSnipe(env: Env, user: AuthUser, request: Request): Promise<Response> {
  const input = await body<Record<string, unknown>>(request);
  const rawUrl = String(input.url ?? "");
  const productId = typeof input.productId === "string" ? input.productId : null;
  const targetPrice = input.targetPrice === "" || input.targetPrice == null ? null : Number(input.targetPrice);
  const alertOnRestock = input.alertOnRestock !== false;
  const variantLabel = input.variantLabel ? String(input.variantLabel).trim() : null;

  if (!rawUrl && !productId) return error("A product URL is required", 400);
  if (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice <= 0)) return error("Invalid target price", 400);

  const db = userDb(env, user.token);
  const { data: profile } = await db.from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const plan = profile?.plan ?? "free";
  if (variantLabel && !PLANS[plan].variantTracking) return error("Variant tracking is a Pro feature.", 403);

  const { count } = await db.from("snipes").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("status", "active");
  if ((count ?? 0) >= PLANS[plan].maxActiveSnipes) {
    return error(`Free plan limit reached (${PLANS.free.maxActiveSnipes} active snipes). Upgrade to Pro for unlimited.`, 403);
  }

  let resolvedProductId = productId;
  if (!resolvedProductId) {
    try {
      normalizeProductUrl(rawUrl);
      resolvedProductId = (await ingestProduct(env, rawUrl)).id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      return error(/URL|host|Private/i.test(message) ? message : "Could not read this product page.", 422);
    }
  }

  let cheaper: { price: number; retailer: string } | null = null;
  if (plan === "pro") {
    const admin = adminDb(env);
    const { data: tracked } = await admin.from("products").select("gtin_ean, current_price").eq("id", resolvedProductId).single();
    if (tracked?.gtin_ean) {
      const { data: alternatives } = await admin.from("products")
        .select("current_price, retailers(name)").eq("gtin_ean", tracked.gtin_ean);
      for (const row of alternatives ?? []) {
        const name = (row.retailers as unknown as { name: string } | null)?.name ?? "another store";
        if (row.current_price === null || tracked.current_price === null || row.current_price >= tracked.current_price) continue;
        if (!cheaper || row.current_price < cheaper.price) cheaper = { price: row.current_price, retailer: name };
      }
    }
  }

  const { data, error: err } = await db.from("snipes").insert({
    user_id: user.id,
    product_id: resolvedProductId,
    target_price: targetPrice,
    alert_on_restock: alertOnRestock,
    variant_label: variantLabel,
  }).select("*, products(*, retailers(*))").single();

  if (err) return error(err.message.includes("FREE_TIER_LIMIT") ? "Free plan limit reached." : err.message, 403);
  return json({ snipe: data, cheaper }, 201);
}

export async function updateSnipe(env: Env, user: AuthUser, id: string, request: Request): Promise<Response> {
  const input = await body<Record<string, unknown>>(request);
  const update: {
    status?: SnipeStatus;
    target_price?: number | null;
    alert_on_restock?: boolean;
  } = {};
  if (["active", "paused", "triggered"].includes(String(input.status))) update.status = input.status as SnipeStatus;
  if (input.targetPrice !== undefined) {
    update.target_price = input.targetPrice === "" || input.targetPrice == null ? null : Number(input.targetPrice);
  }
  if (input.alertOnRestock !== undefined) update.alert_on_restock = Boolean(input.alertOnRestock);

  const { data, error: err } = await userDb(env, user.token).from("snipes")
    .update(update).eq("id", id).eq("user_id", user.id)
    .select("*, products(*, retailers(*))").single();
  if (err) return error(err.message, 500);
  return json({ snipe: data });
}

export async function deleteSnipe(env: Env, user: AuthUser, id: string): Promise<Response> {
  const { error: err } = await userDb(env, user.token).from("snipes")
    .delete().eq("id", id).eq("user_id", user.id);
  if (err) return error(err.message, 500);
  return json({ ok: true });
}

export async function extract(env: Env, user: AuthUser, request: Request): Promise<Response> {
  const input = await body<{ url?: string }>(request);
  if (!input.url) return error("A product URL is required", 400);
  try {
    const extracted = await fetchAndExtract(input.url);
    const retailer = await resolveRetailer(env, extracted.domain, extracted.retailerName);
    return json({
      product: {
        ...extracted,
        retailer,
        affiliateUrl: wrapAffiliateUrl(retailer.affiliate_template, extracted.normalizedUrl, extracted.gtinEan),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(/URL|host|Private/i.test(message) ? message : "Could not read this product page.", 400);
  }
}
