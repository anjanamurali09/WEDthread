import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicMarketingHeader } from "@/components/public-marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { AppShell } from "@/components/app-shell";
import { VendorEnquireDialog } from "@/components/vendor-enquire-dialog";
import { ReviewsSection } from "@/components/reviews-section";
import { LeaveReviewButton } from "@/components/leave-review-button";
import { ClaimBusinessButton } from "@/components/claim-business-button";
import { SuggestEditButton } from "@/components/suggest-edit-button";
import { ScrollGallery } from "@/components/scroll-gallery";
import { formatMoney } from "@/lib/currency";
import { SocialIconLinks, type SocialLinkValues } from "@/components/social-links";
import { useSavedListings } from "@/hooks/use-saved-listings";
import { LoginDialog } from "@/components/login-dialog";
import { useAnonViewGate } from "@/hooks/use-anon-view-gate";
import { SignUpGate } from "@/components/sign-up-gate";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { HeaderBodyItem } from "@/components/header-body-list-editor";
import { cn, truncateWords } from "@/lib/utils";
import { MapPin, Heart, Quote, Tag, Mail, Phone } from "lucide-react";

// Keeps the hero side panel from stretching to whatever length a listing's
// description happens to be — the About section further down the page
// still shows the description in full.
const HERO_DESCRIPTION_MAX_WORDS = 100;

// Overview / Key Info / Gallery / About / Testimonials / FAQ, with a sticky
// sub-nav that jumps between them — same fixed-headers pattern, and the
// same vendor_services columns (about_sections/faqs), as the venue page
// (src/routes/venue_.$businessId.tsx). Pricing renders as its own section
// further down when a listing has real pricing data, but isn't in the nav —
// most listings only have the $-tier marketplace price.
const SECTION_ORDER = ["overview", "key-info", "gallery", "about", "testimonials", "faq"] as const;
const SECTION_LABEL: Record<(typeof SECTION_ORDER)[number], string> = {
  overview: "Overview", "key-info": "Key Info", gallery: "Gallery",
  about: "About", testimonials: "Testimonials", faq: "FAQ",
};

// Escaped filename so this is a sibling of /v, not nested under it.
export const Route = createFileRoute("/v_/$businessId")({ component: VendorProfilePage });

type Business = {
  id: string; legal_business_name: string; business_description: string;
  verification_status: "pending" | "verified"; user_id: string | null;
  city: string | null; country: string | null;
  contact_email: string | null; contact_phone: string | null;
} & SocialLinkValues;
type VendorService = {
  id: string;
  category_ids: string[];
  description: string | null;
  price_range_min: number | null; price_range_max: number | null;
  price_start_from: number | null; price_start_from_currency: string | null;
  minimum_spend: number | null; minimum_spend_currency: string | null;
  about_sections: HeaderBodyItem[]; faqs: HeaderBodyItem[];
  price_details: string | null; price_includes: string[]; price_additional_costs: string[];
};
type Media = { id: string; media_type: "photo" | "video"; url: string };

function VendorProfilePage() {
  const { businessId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [service, setService] = useState<VendorService | null>(null);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [reviewsRefresh, setReviewsRefresh] = useState(0);
  const { loading: gateLoading, gated } = useAnonViewGate(businessId, "vendor");
  const { signedIn: canSave, saved, toggle } = useSavedListings();
  const [authOpen, setAuthOpen] = useState(false);

  const handleToggleSaved = () => {
    if (!canSave) { setAuthOpen(true); return; }
    toggle({ businessId, listingId: service?.id ?? null });
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setSignedIn(!!u.user);

      const { data: biz } = await supabase
        .from("businesses")
        .select("id,legal_business_name,business_description,verification_status,user_id,city,country,instagram_url,tiktok_url,facebook_url,youtube_url,website_url,contact_email,contact_phone")
        .eq("id", businessId).eq("business_type", "vendor").maybeSingle();
      if (!biz) { setLoading(false); return; }
      setBusiness(biz as Business);

      const { data: svc } = await supabase.from("vendor_services").select("*").eq("business_id", businessId).order("created_at").limit(1).maybeSingle();
      const [{ data: listingMedia }, { data: bizMedia }, { data: cats }] = await Promise.all([
        svc ? supabase.from("business_media").select("id,media_type,url").eq("listing_id", svc.id).order("sort_order") : Promise.resolve({ data: [] as Media[] }),
        supabase.from("business_media").select("id,media_type,url").eq("business_id", businessId).is("listing_id", null).order("sort_order"),
        svc && (svc.category_ids ?? []).length > 0
          ? supabase.from("vendor_categories").select("id,name").in("id", svc.category_ids)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);
      setService(svc ? {
        ...(svc as any),
        about_sections: Array.isArray((svc as any).about_sections) ? (svc as any).about_sections : [],
        faqs: Array.isArray((svc as any).faqs) ? (svc as any).faqs : [],
        price_includes: (svc as any).price_includes ?? [],
        price_additional_costs: (svc as any).price_additional_costs ?? [],
      } as VendorService : null);
      setCategoryNames((cats ?? []).map((c) => c.name));
      // Falls back to the business's general photos when the listing has
      // none of its own (the admin "Add vendor" tool only ever uploads at
      // the business level).
      setMedia(((listingMedia?.length ?? 0) > 0 ? listingMedia : bizMedia) as Media[]);
      setLoading(false);
    })();
  }, [businessId]);

  if (loading || gateLoading) return <div className="min-h-screen bg-pearl" />;

  if (!business) {
    return (
      <div className="min-h-screen bg-pearl grid place-items-center text-center px-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-cherry">Not found</p>
          <h1 className="mt-2 font-serif text-3xl">This vendor isn't available.</h1>
          <Link to="/v" className="mt-4 inline-block text-sm text-cherry underline">Back to the marketplace</Link>
        </div>
      </div>
    );
  }

  const photos = media.filter((m) => m.media_type === "photo");
  const videos = media.filter((m) => m.media_type === "video");
  const heroPhoto = photos[0]?.url ?? null;
  const galleryPhotos = photos.slice(1);
  const location = [business.city, business.country].filter(Boolean).join(", ");

  const hasGallery = photos.length > 0 || videos.length > 0;
  const hasPricing = !!(service?.price_start_from || service?.minimum_spend || service?.price_details
    || (service?.price_includes.length ?? 0) > 0 || (service?.price_additional_costs.length ?? 0) > 0);
  const aboutSections = service?.about_sections ?? [];
  const faqs = service?.faqs ?? [];
  const hasFaq = faqs.length > 0;
  const isSaved = service ? saved.has(service.id) : saved.has(business.id);

  const content = (
    <div className={signedIn ? "" : "min-h-screen bg-pearl text-ink"}>
      {!signedIn && <PublicMarketingHeader sticky={false} />}

      <nav className="sticky top-0 z-20 bg-pearl/95 backdrop-blur border-b border-line/60">
        <div className={cn("flex items-center gap-3 px-6 md:px-10 pb-3 overflow-x-auto", signedIn ? "pt-24" : "pt-4")}>
          <div className="flex gap-1 shrink-0">
            {SECTION_ORDER.map((s) => (
              <a key={s} href={`#${s}`}
                className="rounded-full px-4 py-2 text-sm uppercase tracking-wide text-muted-foreground hover:text-ink hover:bg-stone transition-colors whitespace-nowrap">
                {SECTION_LABEL[s]}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {!business.user_id && <ClaimBusinessButton businessId={business.id} businessName={business.legal_business_name} compact />}
            <SuggestEditButton businessId={business.id} businessName={business.legal_business_name} compact />
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section id="overview" className="scroll-mt-16 grid md:grid-cols-[1.6fr_1fr]">
        <div className="aspect-[4/3] md:aspect-auto md:h-[520px] bg-stone">
          {heroPhoto && <img src={heroPhoto} className="w-full h-full object-cover" alt="" />}
        </div>
        <div className="bg-cream/40 px-8 py-10 md:py-12 flex flex-col justify-center">
          <h1 className="font-serif text-4xl">{business.legal_business_name}</h1>
          {location && (
            <p className="mt-2 text-sm uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {location}
            </p>
          )}
          {business.business_description && (
            <p className="mt-5 font-serif text-base text-muted-foreground italic leading-relaxed">
              {truncateWords(business.business_description, HERO_DESCRIPTION_MAX_WORDS)}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {hasGallery && (
              <a href="#gallery" className="rounded-full border border-line px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-stone transition-colors">
                View gallery
              </a>
            )}
            {hasPricing && (
              <a href="#pricing" className="rounded-full border border-line px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-stone transition-colors">
                View pricing
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-10">
        {/* ── Key Info ──────────────────────────────────────────────── */}
        <section id="key-info" className="scroll-mt-16 py-14 border-t border-line/60">
          <h2 className="font-serif text-2xl mb-6">Key Info</h2>
          <div className="rounded-3xl bg-cream/30 p-6 md:p-8 grid gap-8">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm uppercase tracking-widest text-muted-foreground">Location</p>
                {location ? (
                  <p className="text-sm mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-ink" /> {location}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Not listed yet.</p>
                )}
              </div>
              <div className="grid gap-1.5 text-sm">
                {business.website_url && (
                  <p className="inline-flex items-center gap-1.5">
                    <a href={business.website_url.match(/^https?:\/\//i) ? business.website_url : `https://${business.website_url}`}
                      target="_blank" rel="noopener noreferrer" className="text-cherry hover:underline">{business.website_url}</a>
                  </p>
                )}
                {business.contact_email && (
                  <a href={`mailto:${business.contact_email}`} className="inline-flex items-center gap-1.5 hover:text-cherry">
                    <Mail className="h-3.5 w-3.5 text-ink shrink-0" /> {business.contact_email}
                  </a>
                )}
                {business.contact_phone && (
                  <a href={`tel:${business.contact_phone}`} className="inline-flex items-center gap-1.5 hover:text-cherry">
                    <Phone className="h-3.5 w-3.5 text-ink shrink-0" /> {business.contact_phone}
                  </a>
                )}
                <SocialIconLinks links={business} />
                {!business.website_url && !business.contact_email && !business.contact_phone && (
                  <p className="text-muted-foreground">No contact details listed yet.</p>
                )}
              </div>
            </div>

            {categoryNames.length > 0 && (
              <div className="pt-6 border-t border-line/60">
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Categories</p>
                <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
                  {categoryNames.map((name) => (
                    <li key={name} className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-ink shrink-0" /> {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ── Gallery ───────────────────────────────────────────────── */}
        <section id="gallery" className="scroll-mt-16 py-14 border-t border-line/60">
          <h2 className="font-serif text-2xl mb-6">Gallery</h2>
          {hasGallery ? (
            <>
              {(heroPhoto ? [{ id: "hero", url: heroPhoto }, ...galleryPhotos] : galleryPhotos).length > 0 && (
                <ScrollGallery items={heroPhoto ? [{ id: "hero", url: heroPhoto }, ...galleryPhotos] : galleryPhotos} />
              )}
              {videos.length > 0 && (
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  {videos.map((m) => <video key={m.id} src={m.url} controls className="w-full rounded-2xl border border-line" />)}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          )}
        </section>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        {hasPricing && service && (
          <section id="pricing" className="scroll-mt-16 py-14 border-t border-line/60">
            <h2 className="font-serif text-2xl mb-6">Pricing</h2>
            {service.price_start_from != null && (
              <p className="font-serif text-3xl italic">From {formatMoney(service.price_start_from, service.price_start_from_currency ?? "USD")}</p>
            )}
            {service.minimum_spend != null && (
              <p className="mt-2 text-lg">
                <span className="text-muted-foreground">Minimum spend: </span>
                {formatMoney(service.minimum_spend, service.minimum_spend_currency ?? "USD")}
              </p>
            )}
            {service.price_details && <p className="mt-2 text-sm text-muted-foreground italic max-w-2xl">{service.price_details}</p>}

            {(service.price_includes.length > 0 || service.price_additional_costs.length > 0) && (
              <div className="mt-8 grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-6">
                {service.price_includes.length > 0 && (
                  <>
                    <p className="text-sm uppercase tracking-widest text-muted-foreground">Starting price includes</p>
                    <ul className="space-y-2 text-sm">
                      {service.price_includes.map((it) => <li key={it} className="flex gap-2"><span className="text-cherry">•</span> {it}</li>)}
                    </ul>
                  </>
                )}
                {service.price_additional_costs.length > 0 && (
                  <>
                    <p className="text-sm uppercase tracking-widest text-muted-foreground">Additional costs</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {service.price_additional_costs.map((it) => <li key={it} className="flex gap-2"><span className="text-cherry">•</span> {it}</li>)}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── About ─────────────────────────────────────────────────── */}
        <section id="about" className="scroll-mt-16 py-14 border-t border-line/60">
          <h2 className="font-serif text-2xl mb-6">About</h2>
          {aboutSections.length > 0 ? (
            <div className="grid gap-8">
              {aboutSections.map((s, i) => (
                <div key={i} className="grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-2">
                  <p className="text-sm uppercase tracking-widest text-muted-foreground">{s.header}</p>
                  <p className="text-muted-foreground whitespace-pre-line max-w-2xl">{s.body}</p>
                </div>
              ))}
            </div>
          ) : business.business_description ? (
            <p className="text-muted-foreground max-w-2xl">{business.business_description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description yet.</p>
          )}
        </section>

        {/* ── Testimonials ──────────────────────────────────────────── */}
        <section id="testimonials" className="scroll-mt-16 py-14 border-t border-line/60">
          <div className="text-center mb-8">
            <Quote className="h-6 w-6 mx-auto text-line" />
            <h2 className="font-serif text-2xl mt-2">Testimonials</h2>
          </div>
          <div className="flex items-center justify-center mb-4">
            <LeaveReviewButton businessId={business.id} businessName={business.legal_business_name} onSaved={() => setReviewsRefresh((n) => n + 1)} />
          </div>
          <ReviewsSection businessId={business.id} refreshKey={reviewsRefresh} />
        </section>
      </div>

      {/* ── FAQ (dark band) ──────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-16 py-16 bg-ink text-pearl">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          <h2 className="font-serif text-4xl mb-8">FAQs</h2>
          {hasFaq ? (
            <Accordion type="single" collapsible>
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-pearl/20">
                  <AccordionTrigger className="text-pearl hover:no-underline text-sm uppercase tracking-widest [&>svg]:text-pearl">{f.header}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line text-pearl/80">{f.body}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-pearl/70">No FAQs yet. Check back soon.</p>
          )}
        </div>
      </section>

      {/* ── Sticky bottom CTA bar ─────────────────────────────────────── */}
      <div className="sticky bottom-4 z-20 mt-10 flex justify-center px-6 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ink text-pearl pl-2 pr-2.5 py-2 shadow-lg">
          {service && (
            <VendorEnquireDialog vendorServiceId={service.id} serviceName={business.legal_business_name} businessName={business.legal_business_name} triggerLabel="Enquire"
              renderTrigger={(open) => (
                <button type="button" onClick={open}
                  className="rounded-full bg-pearl/10 hover:bg-pearl/20 px-5 py-2 text-sm font-medium whitespace-nowrap cursor-pointer">
                  Enquire
                </button>
              )} />
          )}
          <button type="button" onClick={handleToggleSaved} aria-label={isSaved ? "Remove from saved" : "Save"} aria-pressed={isSaved}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pearl/10 hover:bg-pearl/20 cursor-pointer">
            <Heart className={cn("h-4 w-4", isSaved ? "fill-cherry text-cherry" : "text-pearl")} />
          </button>
        </div>
      </div>

      <LoginDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />
      {!signedIn && <SiteFooter />}
    </div>
  );

  if (gated) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm">{content}</div>
        <SignUpGate backTo="/v" />
      </div>
    );
  }

  if (signedIn) {
    return <AppShell>{content}</AppShell>;
  }
  return content;
}
