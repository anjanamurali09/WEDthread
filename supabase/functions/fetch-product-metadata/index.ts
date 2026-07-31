// Fetches a product URL server-side (avoids browser CORS) and reads its Open
// Graph metadata for the registry's "paste a link" auto-fill. Runs as a
// Supabase Edge Function (Deno) so it works regardless of how/where the
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

// Best-effort only: a currency symbol immediately followed by a number,
// searched in the first slice of the page (roughly "near the top"). Not
// expected to be perfect — it's just a fallback for pages with no price meta.
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

  const name = pick(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]);

  const rawImage = pick(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]);
  const image = absolutize(rawImage, url);

  const priceStr = pick(html, [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:price:amount["']/i,
  ]);
  const metaPrice = priceStr ? Number(priceStr) : null;
  const price = metaPrice != null && Number.isFinite(metaPrice) ? metaPrice : scanPriceNearTop(html);

  if (!name && !image && price == null) return { success: false };
  return { success: true, name, image, price };
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
