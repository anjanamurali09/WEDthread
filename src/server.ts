import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"}, try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Set at build time (vite.config.ts). Cached pages are keyed by it, so a new deploy never serves an older page
// that points at files which no longer exist.
declare const __BUILD_ID__: string | undefined;

// The homepage is the same for every visitor (anyone's login is read in the browser, not on the server), so each
// Cloudflare location keeps a copy for five minutes instead of rendering it again for every visit.
const HOME_CACHE_SECONDS = 300;

async function renderWithHomeCache(request: Request, env: unknown, ctx: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  const cache = (globalThis as any).caches?.default as Cache | undefined;
  if (!cache || typeof __BUILD_ID__ === "undefined" || request.method !== "GET" || url.pathname !== "/" || url.search) return null;

  const key = new Request(`${url.origin}/__home-cache/${__BUILD_ID__}`);
  const hit = await cache.match(key);
  if (hit) {
    const out = new Response(hit.body, hit);
    out.headers.set("cache-control", "public, max-age=0, must-revalidate");
    out.headers.set("x-home-cache", "hit");
    return out;
  }

  const handler = await getServerEntry();
  const response = await normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx));
  if (response.status === 200 && !response.headers.has("set-cookie") && (response.headers.get("content-type") ?? "").includes("text/html")) {
    const stored = new Response(response.clone().body, response);
    stored.headers.set("cache-control", `public, max-age=${HOME_CACHE_SECONDS}`);
    const waitUntil = (ctx as { waitUntil?: (p: Promise<unknown>) => void } | undefined)?.waitUntil;
    try {
      // Without a waitUntil the save would be cut off when the response is sent, so wait for it instead.
      if (waitUntil) waitUntil.call(ctx, cache.put(key, stored));
      else await cache.put(key, stored);
    } catch (error) {
      console.error("home cache save failed", error);
    }
  }
  return response;
}

// Tells browsers to use only secure connections to this site for the next year, and not to guess file types.
function withSecurityHeaders(response: Response): Response {
  if (response.status >= 300 && response.status < 400) return response;
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=31536000");
  headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const cached = await renderWithHomeCache(request, env, ctx);
      if (cached) return withSecurityHeaders(cached);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
