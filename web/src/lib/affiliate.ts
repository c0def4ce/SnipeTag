export function wrapAffiliateUrl(
  template: string | null | undefined,
  url: string,
  gtin: string | null | undefined,
): string {
  if (!template) return url;
  return template
    .replace(/\{url\}/g, encodeURIComponent(url))
    .replace(/\{gtin\}/g, encodeURIComponent(gtin ?? ""));
}

export function productAffiliateUrl(product: {
  normalized_url: string;
  gtin_ean: string | null;
  retailers?: { affiliate_template: string | null } | null;
}): string {
  return wrapAffiliateUrl(product.retailers?.affiliate_template, product.normalized_url, product.gtin_ean);
}
