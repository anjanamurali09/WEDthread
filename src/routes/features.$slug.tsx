import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, ChevronRight, ChevronDown } from "lucide-react";
import { LoginDialog } from "@/components/login-dialog";
import { SiteFooter } from "@/components/site-footer";
import { Logo } from "@/components/logo";
import { SHOWCASE_FEATURES, FeatureVisual, useReveal } from "@/routes/index";
import { FEATURE_CONTENT } from "@/lib/feature-content";
import { canonicalLink, SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

// The search tags for a feature page: its own title and description, the address Google should use, and
// structured data (breadcrumbs and the FAQ) that lets results show the page's structure.
export const Route = createFileRoute("/features/$slug")({
  head: ({ params }) => {
    const content = FEATURE_CONTENT[params.slug];
    if (!content) return { links: canonicalLink(`/features/${params.slug}`) };
    const url = `${SITE_URL}/features/${content.slug}`;
    const breadcrumbs = {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: content.eyebrow, item: url },
      ],
    };
    const faq = {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: content.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    };
    return {
      meta: [
        { title: content.metaTitle },
        { name: "description", content: content.metaDescription },
        { property: "og:title", content: content.metaTitle },
        { property: "og:description", content: content.metaDescription },
        { property: "og:url", content: url },
      ],
      links: canonicalLink(`/features/${content.slug}`),
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(breadcrumbs) },
        { type: "application/ld+json", children: JSON.stringify(faq) },
      ],
    };
  },
  component: FeaturePage,
});

const button = "inline-flex items-center gap-2 rounded-full bg-[#FFE08A] text-[#243746] px-6 py-3 text-sm font-medium transition-all hover:bg-[#243746] hover:text-[#FFF7D6] hover:rounded-2xl hover:gap-3";

function FeaturePage() {
  const { slug } = Route.useParams();
  const rootRef = useReveal();
  const [authOpen, setAuthOpen] = useState<false | "signin" | "signup">(false);

  const feature = SHOWCASE_FEATURES.find((f) => f.slug === slug);
  const page = FEATURE_CONTENT[slug];

  if (!feature || !page) {
    return (
      <div className="min-h-screen grid place-items-center bg-white text-[#243746] px-6 text-center">
        <div>
          <p className="font-serif text-3xl">We couldn't find that page.</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm text-[#7FA8D6] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  const related = page.related.flatMap((s) => {
    const f = SHOWCASE_FEATURES.find((x) => x.slug === s);
    const c = FEATURE_CONTENT[s];
    return f && c ? [{ slug: s, title: f.title, text: c.metaDescription.split(". ")[0].replace(/\.$/, "") + "." }] : [];
  });

  return (
    <div ref={rootRef as any} className="min-h-screen bg-white text-[#243746]">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-line/50 px-6 md:px-12 py-6 flex items-center justify-between">
        <Link to="/" data-static className="flex items-center gap-2">
          <Logo sizeClassName="text-3xl" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#243746] hover:text-[#7FA8D6] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <button onClick={() => setAuthOpen("signup")}
            className="rounded-full bg-[#243746] text-[#FFF7D6] px-5 py-2 text-sm transition-all hover:bg-[#FFE08A] hover:text-[#243746] hover:rounded-2xl">
            Start planning
          </button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-6 md:px-12 pt-8 md:pt-12 pb-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-[#7FA8D6]">Home</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span aria-current="page" className="text-[#243746]">{page.eyebrow}</span>
          </nav>
          <div className="mt-8 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6" data-reveal>
              <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">{page.eyebrow}</p>
              <h1 className="mt-4 font-serif text-4xl md:text-5xl leading-[1.02] tracking-tight text-balance">{page.h1}</h1>
              <p className="mt-6 text-lg text-[#243746] max-w-xl leading-relaxed">{page.intro}</p>
              <ul className="mt-6 space-y-2.5 max-w-xl">
                {page.heroBullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[15px]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4A7CAD]" aria-hidden="true" /> {b}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => setAuthOpen("signup")} className={button}>
                  Start planning for free <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            {page.hero ? (
              <div className="lg:col-span-6 overflow-hidden rounded-[2.5rem]" data-reveal>
                <img src={page.hero.src} alt={page.hero.alt} width={page.hero.width} height={page.hero.height}
                  loading="eager" fetchPriority="high" decoding="async"
                  className="h-[340px] w-full object-cover md:h-[440px]" />
              </div>
            ) : (
              <div className={`lg:col-span-6 relative overflow-hidden rounded-[2.5rem] h-[340px] md:h-[440px] ${feature.tint}`} data-reveal aria-hidden="true">
                <FeatureVisual kind={feature.visual} />
              </div>
            )}
          </div>
        </section>

        {/* Detail blocks */}
        <div className="border-t border-line/60">
          {page.blocks.map((b, i) => (
            <section key={b.h2} className={cn("px-6 md:px-12 py-14 md:py-20", i % 2 === 1 && "bg-[#FFF7D6]/50")}>
              <div className={cn("mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
                <div data-reveal>
                  <h2 className="font-serif text-3xl md:text-4xl leading-tight text-balance">{b.h2}</h2>
                  {b.body.map((p) => <p key={p} className="mt-5 text-[15px] leading-relaxed">{p}</p>)}
                </div>
                <div data-reveal className="space-y-5">
                  {/* The animated preview, kept small, once a page uses a photograph in the hero. */}
                  {page.hero && i === 0 && (
                    <div className={`relative h-[190px] overflow-hidden rounded-3xl ${feature.tint}`} aria-hidden="true">
                      <FeatureVisual kind={feature.visual} />
                    </div>
                  )}
                  {b.photo && (
                    <img src={b.photo.src} alt={b.photo.alt} width={b.photo.width} height={b.photo.height} loading="lazy" decoding="async"
                      className="h-[220px] w-full rounded-3xl object-cover md:h-[260px]" />
                  )}
                  <ul className="space-y-3 rounded-3xl border border-line/70 bg-paper p-7 shadow-sm">
                    {b.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3 text-[15px]">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FFE08A]"><Check className="h-3 w-3" aria-hidden="true" /></span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* How it works */}
        <section className="px-6 md:px-12 py-16 border-t border-line/60">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-serif text-3xl md:text-4xl" data-reveal>How it works</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {page.steps.map((s, i) => (
                <li key={s.title} data-reveal>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#243746] font-serif text-lg text-[#FFF7D6]">{i + 1}</span>
                  <h3 className="mt-4 font-serif text-xl leading-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What makes it different */}
        <section className="px-6 md:px-12 py-16">
          <div className="mx-auto max-w-5xl rounded-[2.5rem] bg-[#FFE08A]/45 px-8 py-12 md:px-14" data-reveal>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight text-balance">{page.different.h2}</h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed">{page.different.body}</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {page.different.points.map((pt) => (
                <li key={pt} className="flex items-start gap-3 text-[15px]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {pt}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 md:px-12 py-16 border-t border-line/60">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-serif text-3xl md:text-4xl" data-reveal>Frequently asked questions</h2>
            {/* Plain <details> elements: the answers are in the page's HTML for search engines, and open without any script. */}
            <div className="mt-8 space-y-2">
              {page.faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-line/60 bg-paper px-5 py-4 open:bg-[#FFF7D6]/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="px-6 md:px-12 py-16 border-t border-line/60">
            <div className="mx-auto max-w-5xl">
              <h2 className="font-serif text-2xl md:text-3xl" data-reveal>Plan the rest of your wedding</h2>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {related.map((r) => (
                  <Link key={r.slug} to="/features/$slug" params={{ slug: r.slug }} data-static data-reveal
                    className="group rounded-3xl border border-line/70 bg-paper p-6 transition-colors hover:bg-[#FFF7D6]">
                    <h3 className="font-serif text-xl">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#4A7CAD] group-hover:gap-2.5 transition-all">Learn more <ArrowRight className="h-3.5 w-3.5" /></span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="relative mx-6 md:mx-12 mb-16 rounded-[3rem] bg-[#FFE08A] text-[#243746] py-20 px-6 md:px-12 text-center overflow-hidden" data-reveal>
          <p className="relative text-sm uppercase tracking-[0.3em] text-[#243746]">For every wedding, anywhere</p>
          <h2 className="relative mt-4 font-serif text-4xl md:text-5xl max-w-2xl mx-auto leading-[0.95]">Ready to plan it your way?</h2>
          <button onClick={() => setAuthOpen("signup")}
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-[#243746] text-[#FFF7D6] px-8 py-4 text-sm font-medium transition-all hover:bg-[#FFF7D6] hover:text-[#243746] hover:rounded-2xl hover:gap-3">
            Start planning for free <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>

      <SiteFooter />

      <LoginDialog
        open={!!authOpen}
        onOpenChange={(v) => setAuthOpen(v ? (authOpen || "signin") : false)}
        initialMode={authOpen || "signin"}
      />
    </div>
  );
}
