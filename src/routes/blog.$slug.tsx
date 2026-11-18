import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Download } from "lucide-react";
import { PublicMarketingHeader } from "@/components/public-marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { BlogCard } from "@/components/blog-card";
import { BLOG_POSTS, formatPostDate, postBySlug, readingMinutes, type Block } from "@/lib/blog-posts";
import { canonicalLink, SITE_NAME, SITE_URL } from "@/lib/seo";

// Each article gets its own title, description, address, social picture and article structured data, so search
// engines and link previews show it properly.
export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    const post = loaderData;
    if (!post) return {};
    const url = `${SITE_URL}/blog/${post.slug}`;
    const image = `${SITE_URL}${post.image}`;
    return {
      meta: [
        { title: post.metaTitle },
        { name: "description", content: post.metaDescription },
        { property: "og:title", content: post.metaTitle },
        { property: "og:description", content: post.metaDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:alt", content: post.imageAlt },
        { name: "twitter:image", content: image },
        { property: "article:published_time", content: post.published },
      ],
      links: canonicalLink(`/blog/${post.slug}`),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.metaDescription,
            image, datePublished: post.published, dateModified: post.published, mainEntityOfPage: url, inLanguage: "en",
            author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/apple-touch-icon.png` } },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div><p className="font-serif text-3xl">We couldn't find that article.</p><Link to="/blog" className="mt-4 inline-block text-sm text-[#4A7CAD] underline">See all articles</Link></div>
    </div>
  ),
  component: BlogArticle,
});

function Render({ b }: { b: Block }) {
  switch (b.t) {
    case "p": return <p className="mt-5 text-[17px] leading-[1.8]">{b.text}</p>;
    case "h2": return <h2 className="mt-12 font-serif text-3xl leading-tight text-balance">{b.text}</h2>;
    case "h3": return <h3 className="mt-8 font-serif text-xl">{b.text}</h3>;
    case "ul": return <ul className="mt-5 list-disc space-y-2 pl-6 text-[17px] leading-[1.7] marker:text-[#7FA8D6]">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case "ol": return <ol start={b.start} className="mt-5 list-decimal space-y-2 pl-6 text-[17px] leading-[1.7] marker:font-medium">{b.items.map((i) => <li key={i}>{i}</li>)}</ol>;
    case "tip": return <p className="mt-8 border-l-4 border-[#FFE08A] bg-[#FFF7D6]/60 px-5 py-4 text-[16px] leading-relaxed">{b.text}</p>;
    case "download": return (
      <a href={b.href} download data-static className="mt-8 flex items-center gap-4 rounded-2xl border border-[#243746]/20 bg-[#FFF7D6]/60 px-5 py-4 transition-colors hover:border-[#243746] hover:bg-[#FFE08A]/40">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#243746] text-[#FFF7D6]"><Download className="h-5 w-5" /></span>
        <span><span className="block font-medium">{b.label}</span><span className="mt-0.5 block text-sm text-muted-foreground">{b.note}</span></span>
      </a>
    );
    case "img": return (
      <figure className="mt-10">
        <img src={b.src} alt={b.alt} width={b.width} height={b.height} loading="lazy" decoding="async" className="w-full object-cover" />
        {b.caption && <figcaption className="mt-2 text-sm text-muted-foreground">{b.caption}</figcaption>}
      </figure>
    );
  }
}

function BlogArticle() {
  const post = Route.useLoaderData();
  const related = post.related.flatMap((s) => (postBySlug(s) ? [postBySlug(s)!] : []));
  return (
    <div className="min-h-screen bg-white text-[#243746]">
      <PublicMarketingHeader />
      <main>
        <article className="px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-[#7FA8D6]">Home</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <Link to="/blog" className="hover:text-[#7FA8D6]">Blog</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span aria-current="page" className="text-[#243746]">{post.category}</span>
            </nav>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-[#4A7CAD]">{post.category}</p>
            <h1 className="mt-3 font-serif text-4xl leading-[1.08] text-balance md:text-5xl">{post.title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">By WEDthread · {formatPostDate(post.published)} · {readingMinutes(post)} min read</p>
          </div>
          <div className="mx-auto mt-8 max-w-5xl">
            <img src={post.image} alt={post.imageAlt} width={1200} height={630} loading="eager" fetchPriority="high" decoding="async" className="aspect-[1200/630] w-full object-cover" />
          </div>
          <div className="mx-auto max-w-3xl">
            {post.body.map((b, i) => <Render key={i} b={b} />)}

            <div className="mt-14 bg-[#FFE08A]/45 px-7 py-8 text-center">
              <p className="font-serif text-2xl">Plan it all in one place</p>
              <p className="mt-2 text-[15px]">Your guest list, RSVPs, seating, budget, registry and wedding website, free to start.</p>
              <Link to="/signup" data-static className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#243746] px-6 py-3 text-sm font-medium text-[#FFF7D6] transition-colors hover:bg-[#FFF7D6] hover:text-[#243746]">
                Start planning for free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="border-t border-line/60 px-6 py-14 md:px-12">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-serif text-2xl md:text-3xl">More wedding planning guides</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-2">{related.map((p) => <BlogCard key={p.slug} post={p} />)}</div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

void BLOG_POSTS;
