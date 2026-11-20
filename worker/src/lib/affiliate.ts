import type { ProductWithRetailer, Retailer } from "./database.types";

/** Wrap an outbound URL with the retailer's affiliate template. */
export function wrapAffiliateUrl(
  template: string | null | undefined,
  url: string,
  gtin: string | null | undefined,
): string {
  if (!template) return url;
  return template
    .replace(/\{url\}/g, encodeURIComponent(url))
    .replace(/\{gtin\}/g, encodeURIComponent(gtin ?? ""))
    .replace(/\{\{gtin\}\}/g, encodeURIComponent(gtin ?? ""));
}

export function productAffiliateUrl(product: ProductWithRetailer | ProductWithRetailerLike): string {
  return wrapAffiliateUrl(
    product.retailers?.affiliate_template,
    product.normalized_url,
    product.gtin_ean,
  );
}

interface ProductWithRetailerLike {
  normalized_url: string;
  gtin_ean: string | null;
  retailers?: Pick<Retailer, "affiliate_template"> | null;
}
