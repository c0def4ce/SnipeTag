import {
  extractProductFromHtml,
  extractShopifyProduct,
  normalizeProductUrl,
  shopifyJsonUrl,
} from "./extract";
import type { ExtractedProduct } from "./extract";

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]", "metadata.google.internal",
]);

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 SnipeTag/1.0",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

/** Shopify JSON → JSON-LD → OpenGraph, using the Workers fetch API. */
export async function fetchAndExtract(rawUrl: string): Promise<ExtractedProduct> {
  const normalized = normalizeProductUrl(rawUrl);
  const parsed = new URL(normalized);
  if (BLOCKED_HOSTS.has(parsed.hostname.toLowerCase()) ||
      /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(parsed.hostname)) {
    throw new Error("Private hosts are not allowed");
  }

  const jsonUrl = shopifyJsonUrl(normalized);
  if (jsonUrl) {
    try {
      const response = await fetch(jsonUrl, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: HEADERS });
      if (response.ok) {
        const extracted = extractShopifyProduct(await response.json(), response.url || normalized);
        if (extracted) return extracted;
      }
    } catch { /* fall through to HTML */ }
  }

  const response = await fetch(normalized, { redirect: "follow", signal: AbortSignal.timeout(12000), headers: HEADERS });
  if (!response.ok) throw new Error(`Retailer returned HTTP ${response.status}`);
  const html = (await response.text()).slice(0, 2_000_000);
  return extractProductFromHtml(html, response.url || normalized);
}
