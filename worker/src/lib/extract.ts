/**
 * Pure, dependency-free extraction helpers for SnipeTag.
 * Supports Shopify product JSON, Schema.org Product JSON-LD and OpenGraph.
 */

export interface ExtractedProduct {
  normalizedUrl: string;
  domain: string;
  retailerName: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  inStock: boolean;
  gtinEan: string | null;
  source: "shopify" | "jsonld" | "opengraph" | "html";
}

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "fbclid", "gclid", "gclsrc", "dclid", "msclkid", "igshid", "mc_cid", "mc_eid",
  "ref", "ref_", "referrer", "source", "aff_id", "affiliate_id", "campaign",
  "click_id", "spm", "scm", "tbpm",
]);

/** Normalize tracking params, hashes and case so the catalog deduplicates correctly. */
export function normalizeProductUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("EMPTY_URL");

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (scheme && !["http", "https"].includes(scheme[1].toLowerCase())) {
    throw new Error("UNSUPPORTED_PROTOCOL");
  }

  let url: URL;
  try {
    url = new URL(scheme ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("UNSUPPORTED_PROTOCOL");

  url.username = "";
  url.password = "";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  const params = [...url.searchParams.entries()].filter(([key]) => {
    const lower = key.toLowerCase();
    return (
      !TRACKING_PARAMS.has(lower) &&
      !lower.startsWith("utm_") &&
      !lower.startsWith("_ga") &&
      !/^(fbclid|gclid|msclkid|dclid|igshid)$/i.test(lower)
    );
  }).sort(([a], [b]) => a.localeCompare(b));

  url.search = "";
  for (const [key, value] of params) url.searchParams.append(key, value);
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}${url.search}`;
}

export function domainFromUrl(url: string): string {
  return new URL(normalizeProductUrl(url)).hostname;
}

export function retailerNameFromDomain(domain: string): string {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length > 1) parts.pop();
  if (parts.length > 1 && ["co", "com", "org", "net", "gov", "ac", "edu"].includes(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return (parts[parts.length - 1] ?? domain)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse "£1,299.00", "1.299,00 €", "$42.50" into a number. */
export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let cleaned = value.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    cleaned = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    cleaned = cleaned.length - lastComma - 1 === 3
      ? cleaned.replace(",", "")
      : cleaned.replace(",", ".");
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

export function parseCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  if (trimmed.includes("£")) return "GBP";
  if (trimmed.includes("€")) return "EUR";
  if (trimmed.includes("$")) return "USD";
  if (trimmed.includes("¥")) return "JPY";
  return null;
}

const IN_STOCK = ["instock", "instoreonly", "onlineonly", "limitedavailability", "preorder", "presale", "backorder"];
const OUT_OF_STOCK = ["outofstock", "soldout", "discontinued", "notavailable", "unavailable"];

export function parseAvailability(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const raw = value.split(/[/|,]/).pop()!.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (IN_STOCK.some((v) => raw.includes(v))) return true;
  if (OUT_OF_STOCK.some((v) => raw.includes(v))) return false;
  if (/^(available|true|yes|1)$/.test(raw)) return true;
  if (/^(unavailable|false|no|0)$/.test(raw)) return false;
  return null;
}

/** Extract a plausible EAN/GTIN (8–14 digits, with optional check-digit whitespace). */
export function extractGtin(...values: unknown[]): string | null {
  for (const value of values) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
      if (typeof candidate !== "string" && typeof candidate !== "number") continue;
      const raw = String(candidate).replace(/[\s-]/g, "");
      if (/^\d{8,14}$/.test(raw)) return raw;
      const urlMatch = /\/(\d{8,14})(?:\?|$)/.exec(String(candidate));
      if (urlMatch) return urlMatch[1];
    }
  }
  return null;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenNodes(value: unknown, out: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) for (const item of value) flattenNodes(item, out);
  else if (isRecord(value)) {
    if (value["@graph"] !== undefined) flattenNodes(value["@graph"], out);
    out.push(value);
  }
  return out;
}

function hasType(node: JsonRecord, type: string): boolean {
  const raw = node["@type"];
  if (typeof raw === "string") return raw.toLowerCase() === type.toLowerCase();
  if (Array.isArray(raw)) return raw.some((t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase());
  return false;
}

export function parseJsonLd(html: string): JsonRecord[] {
  const nodes: JsonRecord[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1]
      .replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "")
      .replace(/^\s*<!--/, "").replace(/-->\s*$/, "").trim();
    if (!raw) continue;
    try { flattenNodes(JSON.parse(raw), nodes); } catch { /* skip malformed block */ }
  }
  return nodes;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function extractImage(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = extractImage(item); if (found) return found; }
  }
  if (isRecord(value)) return firstString(value.url, value.contentUrl, value.src, value["@id"]);
  return null;
}

function absoluteImage(url: string | null, base: string): string | null {
  if (!url) return null;
  try {
    if (url.startsWith("//")) return `https:${url}`;
    if (!/^https?:\/\//i.test(url)) return new URL(url, base).toString();
  } catch {
    return null;
  }
  return url;
}

function metaTag(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const found = re.exec(html);
    if (found) return decodeEntities(found[1]);
  }
  return null;
}

function decodeEntities(value: string): string {
  return value.replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").trim();
}

function baseProduct(finalUrl: string) {
  const normalizedUrl = normalizeProductUrl(finalUrl);
  const domain = domainFromUrl(normalizedUrl);
  return { normalizedUrl, domain, retailerName: retailerNameFromDomain(domain), currency: "GBP" };
}

/** Shopify's /products/<handle>.json fast path. */
export function extractShopifyProduct(json: unknown, finalUrl: string): ExtractedProduct | null {
  const record = json as { product?: JsonRecord };
  const product = record?.product;
  if (!isRecord(product)) return null;
  const variants = Array.isArray(product.variants) ? product.variants.filter(isRecord) : [];
  const first = variants[0] ?? {};
  const price = parsePrice(first.price ?? product.price);
  const inStock = variants.some((v) => v.available !== false);
  const gtinEan = extractGtin(first.barcode, first.sku, product.barcode, product.tags);

  return {
    ...baseProduct(finalUrl),
    title: firstString(product.title) ?? "Untitled product",
    imageUrl: absoluteImage(extractImage(product.images), finalUrl),
    price,
    inStock,
    gtinEan,
    source: "shopify",
  };
}

/** True when a URL looks like a Shopify product route we can query as .json. */
export function shopifyJsonUrl(url: string): string | null {
  try {
    const parsed = new URL(normalizeProductUrl(url));
    const match = /\/products\/([^/]+)\/?$/.exec(parsed.pathname);
    if (!match) return null;
    parsed.pathname = `/products/${match[1]}.json`;
    parsed.search = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Schema.org JSON-LD with OpenGraph / HTML fallback. */
export function extractProductFromHtml(html: string, finalUrl: string): ExtractedProduct {
  const base = baseProduct(finalUrl);
  const nodes = parseJsonLd(html);
  const product = nodes.find((n) => hasType(n, "Product"));

  let title: string | null = null;
  let imageUrl: string | null = null;
  let price: number | null = null;
  let currency: string | null = null;
  let inStock: boolean | null = null;
  let gtinEan: string | null = null;
  let source: ExtractedProduct["source"] = "html";

  if (product) {
    source = "jsonld";
    title = firstString(product.name, product.title);
    imageUrl = extractImage(product.image);
    gtinEan = extractGtin(product.gtin13, product.gtin12, product.gtin8, product.gtin,
      product.ean, product.identifier, product.mpn, product.sku);

    const offers = Array.isArray(product.offers) ? product.offers : product.offers ? [product.offers] : [];
    for (const offer of offers) {
      if (!isRecord(offer)) continue;
      price ??= parsePrice(offer.price ?? offer.lowPrice);
      currency ??= parseCurrency(offer.priceCurrency ?? offer.currency);
      inStock ??= parseAvailability(offer.availability ?? offer.itemCondition);
      gtinEan ??= extractGtin(offer.gtin13, offer.gtin, offer.sku);
    }
  }

  title ??= metaTag(html, "og:title") ?? metaTag(html, "twitter:title") ??
    firstString(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]);
  imageUrl ??= metaTag(html, "og:image") ?? metaTag(html, "og:image:secure_url") ?? metaTag(html, "twitter:image");
  const rawPrice = metaTag(html, "product:price:amount") ?? metaTag(html, "og:price:amount");
  price ??= parsePrice(rawPrice);
  currency ??= parseCurrency(metaTag(html, "product:price:currency") ?? metaTag(html, "og:price:currency")) ?? parseCurrency(rawPrice);
  inStock ??= parseAvailability(metaTag(html, "og:availability") ?? metaTag(html, "product:availability"));
  gtinEan ??= extractGtin(metaTag(html, "product:gtin"), metaTag(html, "product:id"));
  if (source !== "jsonld" && (title || price !== null)) source = "opengraph";

  imageUrl = absoluteImage(imageUrl, base.normalizedUrl);

  return {
    ...base,
    title: title || "Untitled product",
    imageUrl,
    price,
    currency: currency ?? "GBP",
    inStock: inStock ?? false,
    gtinEan,
    source,
  };
}
