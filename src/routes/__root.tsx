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

// Google Tag Manager (Google Analytics is configured inside Tag Manager). RootShell wraps every page, so
// these two snippets, pasted exactly as Google provides them, are on every page of the site.
const GTM_HEAD_SNIPPET = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M6N7QG3S');</script>
<!-- End Google Tag Manager -->`;

const GTM_BODY_SNIPPET = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M6N7QG3S"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Tag Manager goes as high in <head> as possible: before everything else. */}
        <GoogleTagManagerHead />
        <HeadContent />
      </head>
      <body>
        {/* ...and its noscript fallback immediately after the opening <body> tag. */}
        <GoogleTagManagerBody />
        {children}<Scripts />
      </body>
    </html>
  );
}

// The snippets are raw HTML (comments and all), so they are inserted as-is rather than rebuilt in JSX.
function GoogleTagManagerHead() {
  return <script dangerouslySetInnerHTML={{ __html: GTM_HEAD_SNIPPET.replace(/^<!--.*-->\n<script>/, "").replace(/<\/script>\n<!--.*-->$/, "") }} />;
}
function GoogleTagManagerBody() {
  return <noscript dangerouslySetInnerHTML={{ __html: GTM_BODY_SNIPPET.replace(/^<!--.*-->\n<noscript>/, "").replace(/<\/noscript>\n<!--.*-->$/, "") }} />;
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
    </QueryClientProvider>
  );
}
