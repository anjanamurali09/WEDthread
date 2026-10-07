import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";

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
      { title: "WedThread, Wedding planning for many cultures, many ceremonies" },
      { name: "description", content: "The wedding platform built for multicultural and destination weddings. Multiple ceremonies, multiple cultures, one plan." },
      { name: "author", content: "WedThread" },
      { name: "theme-color", content: "#FFFDF9" },
      { property: "og:title", content: "WedThread, Wedding planning for many cultures, many ceremonies" },
      { property: "og:description", content: "Plan multiple ceremonies, invite guests across countries, seat them, and message them, all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Fraunces:ital,wght@0,400;1,400&family=Bodoni+Moda:ital,wght@0,700;1,700&family=Mrs+Saint+Delafield&display=swap" },
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

// The Google tag (Google Analytics) and Google Tag Manager must not run before the visitor has agreed, so this inline
// script (first thing in <head>) sets Google Consent Mode to "denied", and only if the visitor accepted on an
// earlier visit does it grant analytics and run Google's snippet. Everyone else is asked by the cookie banner,
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
  // Google tag (gtag.js) for Google Analytics: one copy per page, exactly as Google provides it.
  window.__gaLoaded = true;
  var ga = document.createElement('script'); ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-NFYMMPD7DC';
  document.head.appendChild(ga);
  gtag('js', new Date());
  gtag('config', 'G-NFYMMPD7DC');
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
        <HeadContent />
      </head>
      <body>
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
