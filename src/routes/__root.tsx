import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// The app's two main fonts are served from the website itself (not Google), so every visitor gets exactly the
// same type even if Google Fonts is slow, blocked or declined.
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/400-italic.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ErrorBar } from "@/components/error-bar";
import { CookieBanner } from "@/components/cookie-banner";

import { OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { LogoSprite } from "@/components/logo";
// The first fonts the page needs are fetched straight away, so the text does not jump when they arrive.
import newsreaderRegular from "@fontsource/newsreader/files/newsreader-latin-400-normal.woff2?url";
import newsreaderItalic from "@fontsource/newsreader/files/newsreader-latin-400-italic.woff2?url";
import poppinsRegular from "@fontsource/poppins/files/poppins-latin-400-normal.woff2?url";
import poppinsMedium from "@fontsource/poppins/files/poppins-latin-500-normal.woff2?url";
import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";

const TEMPLATE_FONTS_AFTER_LOAD = `window.addEventListener("load",function(){var l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Fraunces:ital,wght@0,400;1,400&family=Bodoni+Moda:ital,wght@0,700;1,700&family=Mrs+Saint+Delafield&display=swap";document.head.appendChild(l)});`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-serif text-6xl italic text-clay">404</p>
        <h2 className="mt-4 font-serif text-3xl text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-clay"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-ink">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:bg-clay"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-line px-6 py-2.5 text-sm text-ink hover:bg-stone">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WEDthread - Wedding planning for everyone, all in one place" },
      { name: "description", content: "Plan every ceremony, guest, RSVP, seat and budget in one place. WEDthread is built for multicultural and destination weddings." },
      { name: "author", content: "WEDthread" },
      { name: "theme-color", content: "#FFFDF9" },
      { property: "og:title", content: "WEDthread - Wedding planning for everyone, all in one place" },
      { property: "og:description", content: "Plan every ceremony, guest, RSVP, seat and budget in one place. WEDthread is built for multicultural and destination weddings." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_GB" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "WEDthread: for every wedding, anywhere" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      ...[newsreaderRegular, newsreaderItalic, poppinsRegular, poppinsMedium].map((href) => ({ rel: "preload", as: "font", type: "font/woff2", href, crossOrigin: "anonymous" as const })),
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Google Tag Manager (which carries the Google Analytics tag) must not run before the visitor has agreed, so this
// inline script (first thing in <head>) sets Google Consent Mode to "denied", and only if the visitor accepted on
// an earlier visit does it grant analytics and run Google's Tag Manager snippet. Everyone else is asked by the cookie banner,
// which loads Tag Manager the moment they accept (see lib/cookie-consent.ts). No Tag Manager noscript fallback
// is included: it would load Google for visitors who had no chance to say no.
const CONSENT_AND_TAG_MANAGER = `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
  var granted = false;
  try { var c = JSON.parse(localStorage.getItem('wedthread.cookie-consent') || 'null'); granted = !!(c && c.analytics); } catch (e) {}
  if (!granted) return;
  gtag('consent','update',{analytics_storage:'granted'});
  window.__gtmLoaded = true;
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-M6N7QG3S');
})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_AND_TAG_MANAGER }} />
        {/* Template fonts for couples' wedding websites. Added after the page has loaded so they never delay the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: TEMPLATE_FONTS_AFTER_LOAD }} />
        <HeadContent />
      </head>
      <body>
        <LogoSprite />
        {children}<Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <ErrorBar />
      <CookieBanner />
    </QueryClientProvider>
  );
}
