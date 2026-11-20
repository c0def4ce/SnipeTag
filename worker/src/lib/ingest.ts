import { normalizeProductUrl, retailerNameFromDomain } from "./extract";
import { fetchAndExtract } from "./fetch-product";
import { adminDb } from "./supabase";
import type { Env } from "../types";
import type { ProductWithRetailer, Retailer } from "./database.types";

export async function resolveRetailer(env: Env, domain: string, name?: string): Promise<Retailer> {
  const db = adminDb(env);
  const { data: existing } = await db.from("retailers").select("*").ilike("domain", domain).maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await db.from("retailers").insert({
    domain,
    name: name || retailerNameFromDomain(domain),
    category: "Marketplaces",
    parser_type: "json_ld",
    is_active: true,
  }).select().single();

  if (error) {
    const { data: raced } = await db.from("retailers").select("*").eq("domain", domain).maybeSingle();
    if (raced) return raced;
    throw error;
  }
  return created;
}

/** Resolve the retailer, scrape once, and upsert into the global catalog. */
export async function ingestProduct(env: Env, rawUrl: string): Promise<ProductWithRetailer> {
  normalizeProductUrl(rawUrl);
  const extracted = await fetchAndExtract(rawUrl);
  const retailer = await resolveRetailer(env, extracted.domain, extracted.retailerName);
  const db = adminDb(env);

  const { data, error } = await db.from("products").upsert({
    retailer_id: retailer.id,
    normalized_url: extracted.normalizedUrl,
    gtin_ean: extracted.gtinEan,
    title: extracted.title,
    category: retailer.category,
    image_url: extracted.imageUrl,
    current_price: extracted.price,
    lowest_ever_price: extracted.price,
    discount_pct: 0,
    currency: extracted.currency,
    in_stock: extracted.inStock,
    check_priority: 1,
    last_checked_at: new Date().toISOString(),
  }, { onConflict: "normalized_url" }).select("*, retailers(*)").single();

  if (error) throw error;
  if (extracted.price !== null) {
    await db.from("price_history").insert({
      product_id: data.id,
      price: extracted.price,
      in_stock: extracted.inStock,
    });
  }
  return data;
}
