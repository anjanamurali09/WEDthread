// Fetches a product URL server-side (avoids browser CORS) and reads its
// structured product data for the registry's "paste a link" auto-fill. Runs as
// a Supabase Edge Function (Deno) so it works regardless of how/where the
// frontend itself is hosted.
//
// Note: large retailers like Amazon actively block server-side/bot HTTP
// requests with a WAF or CAPTCHA — no amount of header tuning here reliably
// gets past that. Failures on Amazon links are expected, not a bug to chase;
// those links fall back to manual entry by design.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FETCH_TIMEOUT_MS = 8000;

type SuccessResult = { success: true; name: string | null; image: string | null; price: number | null };
type FailureResult = { success: false };

function pick(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeHtml(m[1].trim());
  }
  return null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absolutize(maybeUrl: string | null, base: string): string | null {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

// Most storefronts (Shopify, Magento, Salesforce Commerce Cloud, custom builds)
// embed schema.org Product JSON-LD for Google's rich-snippet search results —
// it's the same page, no extra permission needed, but unlike Open Graph tags
// it's scoped precisely to the product (name/image/price), not the page in
// general, so it's far less prone to grabbing an unrelated price or a
// site-wide banner image.
function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // Malformed or multi-document JSON-LD — skip it rather than fail the
      // whole extraction over one bad script tag.
    }
  }
  return blocks;
}

function flattenJsonLd(blocks: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      out.push(obj);
      if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(visit);
    }
  };
  blocks.forEach(visit);
  return out;
}

function isProductType(t: unknown): boolean {
  if (typeof t === "string") return t.toLowerCase() === "product";
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.toLowerCase() === "product");
  return false;
}

function findProductLd(html: string): { name?: string; image?: string; price?: number } | null {
  const product = flattenJsonLd(extractJsonLdBlocks(html)).find((n) => isProductType(n["@type"]));
  if (!product) return null;

  const name = typeof product.name === "string" ? product.name : undefined;

  let image: string | undefined;
  const rawImage = product.image;
  if (typeof rawImage === "string") image = rawImage;
  else if (Array.isArray(rawImage) && typeof rawImage[0] === "string") image = rawImage[0];
  else if (rawImage && typeof rawImage === "object" && typeof (rawImage as any).url === "string") image = (rawImage as any).url;

  let offers = product.offers as any;
  if (Array.isArray(offers)) offers = offers[0];
  let price: number | undefined;
  if (offers && typeof offers === "object") {
    const raw = offers.price ?? offers.lowPrice ?? offers.priceSpecification?.price;
    const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
    if (Number.isFinite(n)) price = n;
  }

  return { name, image, price };
}

// A raw <title> (or a lazily-set og:title) is usually "Product Name | Site
// Name" or "Product Name - Buy Online | Site Name" — strip the site-name
// suffix so the title we fill in is just the product. Only splits on " | "
// (rarely part of a real product name) and only when there's a meaningful
// chunk before it, so a legitimately hyphenated name is left alone.
function cleanTitle(raw: string | null): string | null {
  if (!raw) return raw;
  const pipeIdx = raw.indexOf(" | ");
  return (pipeIdx > 10 ? raw.slice(0, pipeIdx) : raw).trim();
}

// Best-effort only: a currency symbol immediately followed by a number,
// searched in the first slice of the page (roughly "near the top"). Only used
// when neither JSON-LD nor Open Graph gave us a price — it's the least
// reliable signal (can pick up a struck-through "was" price or an unrelated
// number), so it stays last in the fallback order.
function scanPriceNearTop(html: string): number | null {
  const head = html.slice(0, 20_000);
  const m = head.match(/[$£€₹]\s?([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const num = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

async function fetchMetadata(rawUrl: string): Promise<SuccessResult | FailureResult> {
  const u = new URL(rawUrl);
  if (u.protocol !== "http:" && u.protocol !== "https:") return { success: false };
  const url = u.toString();

  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { success: false };
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("xhtml")) return { success: false };
    html = (await res.text()).slice(0, 500_000); // cap 500KB
  } catch {
    // Network error, timeout, or blocked (WAF/CAPTCHA) — treat as a plain miss.
    return { success: false };
  }

  // JSON-LD product data first (most precise); Open Graph / <title> fills in
  // whatever JSON-LD didn't have.
  const ld = findProductLd(html);

  const ogName = pick(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]);
  const name = cleanTitle(ld?.name || ogName);

  const rawImage = ld?.image || pick(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]);
  const image = absolutize(rawImage ?? null, url);

  const priceStr = pick(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:price:amount["']/i,
  ]);
  const ogPrice = priceStr ? Number(priceStr) : null;
  const price = ld?.price ?? (ogPrice != null && Number.isFinite(ogPrice) ? ogPrice : scanPriceNearTop(html));

  if (!name && !image && price == null) return { success: false };
  return { success: true, name: name ?? null, image, price: price ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const respond = (body: SuccessResult | FailureResult) =>
    new Response(JSON.stringify(body), { headers: { ...CORS_HEADERS, "content-type": "application/json" } });

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url) return respond({ success: false });
    const result = await fetchMetadata(url);
    return respond(result);
  } catch {
    // Never let a malformed request or unexpected error surface as a 500 —
    // the frontend only ever needs to distinguish success from "just fall
    // back to manual entry."
    return respond({ success: false });
  }
});
