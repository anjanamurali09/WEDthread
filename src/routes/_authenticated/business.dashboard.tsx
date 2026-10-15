import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { Clock, CheckCircle2, XCircle, Plus, Pencil, ExternalLink, Inbox, Building2, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useActiveRole } from "@/hooks/use-active-role";
import { LISTING_PRICE, openBillingPortal, startListingCheckout } from "@/lib/business-billing";

export const Route = createFileRoute("/_authenticated/business/dashboard")({ component: BusinessDashboardPage });

type Business = {
  id: string;
  legal_business_name: string;
  business_description: string;
  verification_status: "pending" | "verified" | "rejected";
  business_type: "vendor" | "venue";
};

type Subscription = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type VenueDetails = {
  capacity_min: number | null;
  capacity_max: number | null;
  type_of_space: string[];
  facilities_included: string[];
  facilities_excluded: string[];
  price_range_min: number | null;
  price_range_max: number | null;
  currency: string;
};

type Service = {
  id: string;
  category_ids: string[];
  price_range_min: number | null;
  price_range_max: number | null;
  currency: string;
  status: "active" | "inactive";
  categoryNames: string[];
  coverPhoto: string | null;
};

// The business profile card, plus the vendor's one listing underneath it —
// a vendor business has a single listing (category tags + price + media),
// same one-profile-per-business shape as a venue's venue_details.
function BusinessDashboardPage() {
  const { active } = useActiveRole();
  const [business, setBusiness] = useState<Business | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [venueDetails, setVenueDetails] = useState<VenueDetails | null>(null);
  const [newEnquiries, setNewEnquiries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  // Stripe sends people back here right after paying; the listing goes live a moment later, when Stripe tells us.
  const [confirming, setConfirming] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("subscribed"));

  // Vendor and venue businesses share this one workspace — which row to
  // load is whichever business_type matches the currently active workspace
  // (defaulting to vendor, e.g. on first render before the role resolves).
  const wantedType = active === "venue" ? "venue" : "vendor";

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: biz } = await supabase
      .from("businesses").select("id,legal_business_name,business_description,verification_status,business_type")
      .eq("user_id", u.user.id).eq("business_type", wantedType)
      .maybeSingle();
    setBusiness(biz as Business | null);
    if (biz) {
      const { data: sub } = await supabase
        .from("business_subscriptions").select("status,current_period_end,cancel_at_period_end")
        .eq("business_id", biz.id).maybeSingle();
      setSubscription(sub);

      const { count } = await supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("status", "new");
      setNewEnquiries(count ?? 0);
    }
    if (biz && biz.business_type === "venue") {
      const { data: details } = await supabase.from("venue_details").select("*").eq("business_id", biz.id).maybeSingle();
      setVenueDetails(details as VenueDetails | null);
    }
    if (biz && biz.business_type === "vendor") {
      const [{ data: row }, { data: cats }] = await Promise.all([
        supabase.from("vendor_services").select("id,category_ids,price_range_min,price_range_max,currency,status").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("vendor_categories").select("id,name"),
      ]);
      if (row) {
        const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
        const { data: media } = await supabase
          .from("business_media").select("url,sort_order")
          .eq("listing_id", row.id).eq("media_type", "photo").order("sort_order").limit(1);
        setService({
          ...row,
          categoryNames: (row.category_ids ?? []).map((id) => catName.get(id)).filter((n): n is string => !!n),
          coverPhoto: media?.[0]?.url ?? null,
        });
      } else {
        setService(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [wantedType]);

  // After paying, check again every couple of seconds (for up to 30) until the listing shows as live.
  useEffect(() => {
    if (!confirming) return;
    if (business?.verification_status === "verified") { setConfirming(false); return; }
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 15) { window.clearInterval(timer); setConfirming(false); return; }
      load();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [confirming, business?.verification_status]);

  const runBilling = async (action: () => Promise<void>) => {
    setBillingBusy(true);
    try { await action(); } catch (err: any) { toast.error(err.message ?? "Could not open the payment page"); setBillingBusy(false); }
  };

  const toggleStatus = async () => {
    if (!service) return;
    const next = service.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("vendor_services").update({ status: next }).eq("id", service.id);
    if (error) return toast.error(error.message);
    setService((prev) => (prev ? { ...prev, status: next } : prev));
  };

  if (loading) return <AppShell title="Loading…"><div /></AppShell>;

  const isVenue = business?.business_type === "venue";
  const publicProfilePath = isVenue ? `/venue/${business?.id}` : `/v/${business?.id}`;

  return (
    <AppShell title={isVenue ? "Venue workspace" : "Vendor workspace"} subtitle={isVenue ? "Your venue profile and every enquiry it brings in." : "Your business profile and every service you list under it."}>
      {!business ? (
        <p className="text-sm text-muted-foreground">No business profile found yet.</p>
      ) : (
        <>
          <div className="paper-card p-6 md:p-8 max-w-2xl">
            {(() => {
              const live = business.verification_status === "verified";
              const rejected = business.verification_status === "rejected";
              const waitingForPayment = !live && !rejected && confirming;
              return (
                <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${
                  live ? "bg-sage-soft text-ink" : rejected ? "bg-wine-soft text-wine" : "bg-blush-soft text-cherry"
                }`}>
                  {live ? <CheckCircle2 className="h-4 w-4" /> : rejected ? <XCircle className="h-4 w-4" /> : waitingForPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  {live ? (subscription ? "Live" : "Verified")
                    : rejected ? "Not approved. Contact us to resubmit"
                    : waitingForPayment ? "Confirming your payment. Your listing goes live in a moment"
                    : "Not live yet. Subscribe to publish your listing"}
                </div>
              );
            })()}
            {business.verification_status === "pending" && !confirming && (
              <div className="mt-4">
                <button onClick={() => runBilling(() => startListingCheckout(business.id))} disabled={billingBusy}
                  className="inline-flex items-center gap-2 rounded-full bg-cherry text-pearl px-6 py-3 text-sm font-medium hover:bg-wine disabled:opacity-60 cursor-pointer">
                  {billingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Subscribe · ${LISTING_PRICE[business.business_type]} a month`}
                </button>
                <p className="mt-2 text-sm text-muted-foreground">Billed monthly by Stripe. Cancel any time.</p>
              </div>
            )}
            {subscription && (
              <p className="mt-4 text-sm text-muted-foreground">
                {subscription.status === "past_due"
                  ? "Your last payment didn't go through. Update your card to keep your listing live. "
                  : subscription.status === "active" || subscription.status === "trialing"
                    ? `${LISTING_PRICE[business.business_type]} a month. ${subscription.cancel_at_period_end ? "Ends" : "Renews"} ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "soon"}. `
                    : "Your subscription has ended. "}
                <button onClick={() => runBilling(() => openBillingPortal(business.id))} disabled={billingBusy}
                  className="text-cherry underline underline-offset-2 hover:text-wine disabled:opacity-60 cursor-pointer">
                  Manage billing
                </button>
              </p>
            )}
            <h2 className="font-serif text-2xl mt-6">{business.legal_business_name}</h2>
            <p className="text-sm text-muted-foreground mt-2">{business.business_description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link to={publicProfilePath as any} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-cherry uppercase tracking-widest">
                {isVenue ? "Preview profile" : "View public profile"} <ExternalLink className="h-3 w-3" />
              </Link>
              {isVenue && (
                <Link to={"/business/venue-details" as any} className="inline-flex items-center gap-1.5 text-sm text-clay uppercase tracking-widest">
                  <Pencil className="h-3.5 w-3.5" /> Edit venue details
                </Link>
              )}
              <Link to={"/business/messages" as any} className="inline-flex items-center gap-1.5 text-sm text-clay uppercase tracking-widest">
                <Inbox className="h-3.5 w-3.5" /> Enquiries
                {newEnquiries > 0 && <span className="text-[10px] rounded-full px-2 py-0.5 bg-cherry text-pearl normal-case tracking-normal">{newEnquiries} new</span>}
              </Link>
            </div>
          </div>

          {isVenue ? (
            <div className="mt-10 max-w-2xl">
              <h2 className="font-serif text-2xl mb-4 inline-flex items-center gap-2"><Building2 className="h-5 w-5" /> Venue details</h2>
              {!venueDetails ? (
                <p className="text-sm text-muted-foreground">Nothing on file yet. Edit venue details to add capacity, space type, and facilities.</p>
              ) : (
                <div className="paper-card p-6 grid gap-4">
                  {(venueDetails.capacity_min != null || venueDetails.capacity_max != null) && (
                    <p className="text-sm"><span className="text-muted-foreground">Capacity: </span>{venueDetails.capacity_min ?? "?"}–{venueDetails.capacity_max ?? "?"} guests</p>
                  )}
                  {venueDetails.type_of_space.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {venueDetails.type_of_space.map((t) => <span key={t} className="rounded-full bg-stone px-3 py-1 text-sm capitalize">{t}</span>)}
                    </div>
                  )}
                  {venueDetails.facilities_included.length > 0 && (
                    <p className="text-sm"><span className="text-muted-foreground">Included: </span>{venueDetails.facilities_included.join(", ")}</p>
                  )}
                  {venueDetails.facilities_excluded.length > 0 && (
                    <p className="text-sm"><span className="text-muted-foreground">Excluded: </span>{venueDetails.facilities_excluded.join(", ")}</p>
                  )}
                  {venueDetails.price_range_min != null && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Price: </span>
                      {formatMoney(venueDetails.price_range_min, venueDetails.currency)}
                      {venueDetails.price_range_max != null && venueDetails.price_range_max !== venueDetails.price_range_min ? ` – ${formatMoney(venueDetails.price_range_max, venueDetails.currency)}` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-10 max-w-2xl">
              <h2 className="font-serif text-2xl mb-4 inline-flex items-center gap-2"><Building2 className="h-5 w-5" /> Your listing</h2>
              {!service ? (
                <div className="rounded-3xl border border-dashed border-line p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nothing on file yet. Add your categories, pricing, and photos.</p>
                  <Link to={"/business/services/new" as any}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay">
                    <Plus className="h-4 w-4" /> Add your listing
                  </Link>
                </div>
              ) : (
                <div className="paper-card overflow-hidden">
                  <div className="aspect-video bg-stone">
                    {service.coverPhoto && <img src={service.coverPhoto} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      {service.categoryNames.length > 0 && <p className="text-sm text-muted-foreground">{service.categoryNames.join(" • ")}</p>}
                      <span className={`shrink-0 text-[10px] uppercase tracking-widest rounded-full px-2.5 py-1 ${service.status === "active" ? "bg-sage-soft text-ink" : "bg-stone text-muted-foreground"}`}>
                        {service.status}
                      </span>
                    </div>
                    {service.price_range_min != null && (
                      <p className="text-sm mt-2">
                        {formatMoney(service.price_range_min, service.currency)}
                        {service.price_range_max != null && service.price_range_max !== service.price_range_min ? ` – ${formatMoney(service.price_range_max, service.currency)}` : ""}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <Link to={`/business/services/${service.id}` as any} className="inline-flex items-center gap-1 text-sm text-clay hover:text-wine">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button onClick={toggleStatus} className="text-sm text-muted-foreground hover:text-cherry cursor-pointer">
                        {service.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
