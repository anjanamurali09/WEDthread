import { createServerFn } from "@tanstack/react-start";

export type ProductPreview = {
  title: string | null;
  image: string | null;
  price: number | null; // in major units (dollars, not cents)
  currency: string | null;
  retailer: string | null;
  url: string;
};

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

/**
 * Public server fn — fetches a product URL server-side (avoids CORS) and
 * parses Open Graph / Twitter / JSON-LD tags to return a preview card.
 * Same technique used by Joy, Pinterest, Slack, etc.
 */
export const fetchProductPreview = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    const u = new URL(data.url); // throws on invalid
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Invalid URL");
    return { url: u.toString() };
  })
  .handler(async ({ data }): Promise<ProductPreview> => {
    const empty: ProductPreview = { title: null, image: null, price: null, currency: null, retailer: null, url: data.url };
    let host = "";
    try { host = new URL(data.url).hostname.replace(/^www\./, ""); } catch { /* noop */ }
    empty.retailer = host || null;

    let html = "";
    try {
      const res = await fetch(data.url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VowzyBot/1.0; +https://vowzy.app)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return empty;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/html") && !ct.includes("xhtml")) return empty;
      html = (await res.text()).slice(0, 500_000); // cap 500KB
    } catch {
      return empty;
    }

    const title = pick(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const rawImage = pick(html, [
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ]);
    const image = absolutize(rawImage, data.url);

    const priceStr = pick(html, [
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /"price"\s*:\s*"?([\d.]+)"?/i,
    ]);
    const price = priceStr ? Number(priceStr) : null;

    const currency = pick(html, [
      /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i,
      /"priceCurrency"\s*:\s*"([A-Z]{3})"/,
    ]);

    const siteName = pick(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    ]);

    return {
      title,
      image,
      price: Number.isFinite(price!) ? price : null,
      currency: currency ? currency.toUpperCase() : null,
      retailer: siteName || host || null,
      url: data.url,
    };
  });
