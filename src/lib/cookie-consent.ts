// Cookie consent for analytics. Nothing from Google loads until the visitor accepts: the choice is stored in
// the browser, and Google Tag Manager (the one place every Google tag lives, including Google Analytics) is
// only added to the page after "Accept". Rejecting, or never answering, means no analytics cookies and no
// Google requests.

export const CONSENT_KEY = "wedthread.cookie-consent";
export const GTM_ID = "GTM-M6N7QG3S";
export const OPEN_COOKIE_SETTINGS_EVENT = "wedthread:open-cookie-settings";

export type ConsentChoice = { analytics: boolean; at: string };

export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return typeof c?.analytics === "boolean" ? c : null;
  } catch { return null; }
}

declare global { interface Window { dataLayer?: unknown[]; __gtmLoaded?: boolean } }

// Used only to tell Google the consent state; reporting events goes through `track()` in analytics.ts.
export function gtag(..._args: unknown[]) {
  // Google's gtag pushes the `arguments` object itself, not an array.
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer = window.dataLayer || []).push(arguments);
}

// Google's own Tag Manager snippet, unchanged apart from being wrapped so it can run after consent.
export function loadTagManager() {
  if (typeof window === "undefined" || window.__gtmLoaded) return;
  window.__gtmLoaded = true;
  (function (w: any, d: Document, s: string, l: string, i: string) {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const f = d.getElementsByTagName(s)[0] as HTMLElement;
    const j = d.createElement(s) as HTMLScriptElement;
    const dl = l != "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    f.parentNode!.insertBefore(j, f);
  })(window, document, "script", "dataLayer", GTM_ID);
}

function clearAnalyticsCookies() {
  const hosts = [location.hostname, "." + location.hostname.replace(/^www\./, "")];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
    if (name === "_ga" || name === "_gid" || name.startsWith("_ga_") || name.startsWith("_gat")) {
      for (const h of hosts) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${h}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

export function saveConsent(analytics: boolean) {
  const previous = readConsent();
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, at: new Date().toISOString() })); } catch { /* storage blocked: the choice just won't persist */ }
  if (analytics) {
    gtag("consent", "update", { analytics_storage: "granted" });
    loadTagManager();
  } else if (previous?.analytics || window.__gtmLoaded) {
    // Withdrawing consent after analytics had started: stop it and clear its cookies. A reload ensures the
    // already-loaded tag does not keep running.
    gtag("consent", "update", { analytics_storage: "denied" });
    clearAnalyticsCookies();
    window.location.reload();
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
