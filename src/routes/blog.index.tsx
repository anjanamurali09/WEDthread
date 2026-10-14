import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PublicMarketingHeader } from "@/components/public-marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { BlogCard } from "@/components/blog-card";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { canonicalLink, SITE_URL } from "@/lib/seo";

const TITLE = "Wedding Planning Blog: Guides and Ideas | WEDthread";
const DESCRIPTION = "Practical wedding planning guides: what to sort first, how to plan your budget, and new ideas to make your wedding feel like yours.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/blog` },
    ],
    links: canonicalLink("/blog"),
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org", "@type": "Blog", name: "WEDthread wedding planning blog", url: `${SITE_URL}/blog`,
        blogPost: BLOG_POSTS.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE_URL}/blog/${p.slug}`, datePublished: p.published })),
      }),
    }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-white text-[#243746]">
      <PublicMarketingHeader />
      <main className="px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-[#7FA8D6]">Home</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span aria-current="page" className="text-[#243746]">Blog</span>
          </nav>
          <h1 className="mt-8 font-serif text-4xl leading-tight md:text-5xl">Wedding planning guides and ideas</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">Practical advice for planning a wedding that feels like yours, from what to sort first to how to budget and how to make the day personal.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((p) => <BlogCard key={p.slug} post={p} />)}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
