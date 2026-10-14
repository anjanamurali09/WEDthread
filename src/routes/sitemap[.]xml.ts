import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";
import { BLOG_POSTS } from "@/lib/blog-posts";

// The list of public pages for search engines: the main pages, the feature pages, and every approved venue and
// vendor profile. Built on request, so new listings appear without anyone editing a file.
const STATIC_PAGES = ["/", "/venue", "/v", "/privacy", "/blog", ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
  "/features/guest-list", "/features/venues", "/features/budgeting", "/features/website", "/features/vendor-marketplace",
  "/features/seating", "/features/rsvp-automation", "/features/registry"];

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = STATIC_PAGES.map((p) => ({ loc: `${SITE_URL}${p === "/" ? "" : p}` }));
        try {
          const { data } = await supabase
            .from("businesses").select("id,business_type,updated_at").eq("verification_status", "verified").limit(2000);
          for (const b of data ?? []) {
            urls.push({ loc: `${SITE_URL}${b.business_type === "venue" ? "/venue" : "/v"}/${b.id}`, ...(b.updated_at ? { lastmod: b.updated_at.slice(0, 10) } : {}) } as { loc: string });
          }
        } catch { /* the main pages are still listed */ }
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${(u as { lastmod?: string }).lastmod ? `<lastmod>${(u as { lastmod?: string }).lastmod}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
      },
    },
  },
});
