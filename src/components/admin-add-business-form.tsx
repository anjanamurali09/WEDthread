import { useEffect, useState } from "react";
import { preparePhotoForUpload } from "@/lib/prepare-upload";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dropdown } from "@/components/dropdown";
import { SearchableMultiSelect } from "@/components/searchable-multi-select";
import { useVendorCategories } from "@/hooks/use-vendor-categories";
import { ChipToggleGroup } from "@/components/chip-toggle-group";
import { TagListInput } from "@/components/tag-list-input";
import { PriceTierPicker } from "@/components/price-tier-picker";
import { AmountCurrencyField } from "@/components/amount-currency-field";
import { SocialLinksFields, EMPTY_SOCIAL_LINKS, type SocialLinkValues } from "@/components/social-links";
import { HeaderBodyListEditor, type HeaderBodyItem } from "@/components/header-body-list-editor";
import { COUNTRIES } from "@/lib/countries";
import { formatAmountInput, parseAmountInput } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { useSavedFeedback } from "@/hooks/use-saved-feedback";
import { Loader2, FileText, X, Video, ShieldAlert, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Document = { id: string; file_name: string; file_url: string };
type Media = { id: string; media_type: "photo" | "video"; url: string };

const TYPE_OF_SPACE_OPTIONS = ["Indoor", "Outdoor", "Poolside", "Banquet hall", "Rooftop", "Farmhouse", "Beach"];

// Admin-only, single-page tool — deliberately NOT the couple/vendor-facing
// multi-step wizard (BusinessSignupForm): that one is tied to "the
// currently signed-in user's own business" throughout (resumes their
// draft, finish() adds a role to their account).
//
// Two modes: create (no editBusinessId) makes a new business with no
// owner at all (user_id NULL) — someone claims it later, and it's saved as
// already verified since the admin is entering it directly. Edit
// (editBusinessId set) loads an EXISTING unclaimed business — editing is
// only ever offered for unclaimed listings; once a real owner claims one,
// it's theirs to manage, not admin's.
export function AdminAddBusinessForm({ businessType, editBusinessId }: { businessType: "vendor" | "venue"; editBusinessId?: string }) {
  const navigate = useNavigate();
  const isVenue = businessType === "venue";
  const isEdit = !!editBusinessId;
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { status: saveStatus, errorMessage: saveError, markSaved, markError } = useSavedFeedback();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [existingServiceId, setExistingServiceId] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [social, setSocial] = useState<SocialLinkValues>(EMPTY_SOCIAL_LINKS);
  const [bookingLinkUrl, setBookingLinkUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [price, setPrice] = useState("");

  const [capacityMin, setCapacityMin] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [capacitySeated, setCapacitySeated] = useState("");
  const [capacityStanding, setCapacityStanding] = useState("");
  const [typeOfSpace, setTypeOfSpace] = useState<string[]>([]);
  const [facilitiesIncluded, setFacilitiesIncluded] = useState<string[]>([]);
  const [facilitiesExcluded, setFacilitiesExcluded] = useState<string[]>([]);
  const [aboutSections, setAboutSections] = useState<HeaderBodyItem[]>([]);
  const [faqs, setFaqs] = useState<HeaderBodyItem[]>([]);
  const [startFromAmount, setStartFromAmount] = useState("");
  const [startFromCurrency, setStartFromCurrency] = useState("");
  const [minimumSpendAmount, setMinimumSpendAmount] = useState("");
  const [minimumSpendCurrency, setMinimumSpendCurrency] = useState("");
  const [priceDetails, setPriceDetails] = useState("");
  const [priceIncludes, setPriceIncludes] = useState<string[]>([]);
  const [priceAdditionalCosts, setPriceAdditionalCosts] = useState<string[]>([]);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState<"photo" | "video" | null>(null);
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setChecking(false); return; }
      const { data: admin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      setIsAdmin(!!admin);
      setChecking(false);
    })();
  }, []);

  // Seeds the city dropdown's own list from cities already on file — plus
  // `allowCustom` (see Dropdown) so a genuinely new city can still be typed
  // in, not just picked from what's already there.
  useEffect(() => {
    supabase.from("businesses").select("city").not("city", "is", null).then(({ data }) => {
      setCityOptions(Array.from(new Set((data ?? []).map((r) => r.city as string))).sort());
    });
  }, []);

  const { categories, createCategory } = useVendorCategories();

  // Load the existing business for edit mode — only once we know we're
  // admin, so this never fires (and never leaks unclaimed-listing details)
  // for a non-admin visitor.
  useEffect(() => {
    if (!isEdit || checking || !isAdmin) return;
    (async () => {
      const { data: biz, error } = await supabase.from("businesses").select("*").eq("id", editBusinessId!).maybeSingle();
      if (error || !biz) { setBlockedReason("Business not found."); setLoadingExisting(false); return; }
      if (biz.user_id) { setBlockedReason("This business has already been claimed. It's managed by its owner now, not admin."); setLoadingExisting(false); return; }

      setBusinessId(biz.id);
      setLegalName(biz.legal_business_name);
      const { data: priv } = await supabase.from("business_private").select("vat_tax_number").eq("business_id", biz.id).maybeSingle();
      setVatNumber(priv?.vat_tax_number ?? "");
      setCountry(biz.country ?? "");
      setCity(biz.city ?? "");
      setAddress(biz.address ?? "");
      setSocial({
        instagram_url: biz.instagram_url ?? "",
        tiktok_url: biz.tiktok_url ?? "",
        facebook_url: biz.facebook_url ?? "",
        youtube_url: biz.youtube_url ?? "",
        website_url: biz.website_url ?? "",
      });
      setBookingLinkUrl(biz.booking_link_url ?? "");
      setContactEmail(biz.contact_email ?? "");
      setContactPhone(biz.contact_phone ?? "");
      setDescription(biz.business_description);

      const [{ data: docs }, { data: med }] = await Promise.all([
        supabase.from("business_documents").select("id,file_name,file_url").eq("business_id", biz.id),
        supabase.from("business_media").select("id,media_type,url").eq("business_id", biz.id).is("listing_id", null).order("sort_order"),
      ]);
      setDocuments(docs ?? []);
      setMedia((med ?? []) as Media[]);

      if (isVenue) {
        const { data: details } = await supabase.from("venue_details").select("*").eq("business_id", biz.id).maybeSingle();
        if (details) {
          setCapacityMin(details.capacity_min != null ? String(details.capacity_min) : "");
          setCapacityMax(details.capacity_max != null ? String(details.capacity_max) : "");
          setCapacitySeated(details.capacity_seated != null ? String(details.capacity_seated) : "");
          setCapacityStanding(details.capacity_standing != null ? String(details.capacity_standing) : "");
          setTypeOfSpace(details.type_of_space ?? []);
          setFacilitiesIncluded(details.facilities_included ?? []);
          setFacilitiesExcluded(details.facilities_excluded ?? []);
          setPrice(details.price_range_min != null ? String(details.price_range_min) : "");
          setAboutSections(Array.isArray(details.about_sections) ? (details.about_sections as unknown as HeaderBodyItem[]) : []);
          setFaqs(Array.isArray(details.faqs) ? (details.faqs as unknown as HeaderBodyItem[]) : []);
          setStartFromCurrency(details.price_start_from_currency ?? "");
          setStartFromAmount(details.price_start_from != null ? formatAmountInput(String(details.price_start_from), details.price_start_from_currency ?? "USD") : "");
          setMinimumSpendCurrency(details.minimum_spend_currency ?? "");
          setMinimumSpendAmount(details.minimum_spend != null ? formatAmountInput(String(details.minimum_spend), details.minimum_spend_currency ?? "USD") : "");
          setPriceDetails(details.price_details ?? "");
          setPriceIncludes(details.price_includes ?? []);
          setPriceAdditionalCosts(details.price_additional_costs ?? []);
        }
      } else {
        const { data: service } = await supabase.from("vendor_services").select("*").eq("business_id", biz.id).order("created_at").limit(1).maybeSingle();
        if (service) {
          setExistingServiceId(service.id);
          setCategoryIds(service.category_ids ?? []);
          setPrice(service.price_range_min != null ? String(service.price_range_min) : "");
          setStartFromCurrency(service.price_start_from_currency ?? "");
          setStartFromAmount(service.price_start_from != null ? formatAmountInput(String(service.price_start_from), service.price_start_from_currency ?? "USD") : "");
          setMinimumSpendCurrency(service.minimum_spend_currency ?? "");
          setMinimumSpendAmount(service.minimum_spend != null ? formatAmountInput(String(service.minimum_spend), service.minimum_spend_currency ?? "USD") : "");
          setAboutSections(Array.isArray(service.about_sections) ? (service.about_sections as unknown as HeaderBodyItem[]) : []);
          setFaqs(Array.isArray(service.faqs) ? (service.faqs as unknown as HeaderBodyItem[]) : []);
          setPriceDetails(service.price_details ?? "");
          setPriceIncludes(service.price_includes ?? []);
          setPriceAdditionalCosts(service.price_additional_costs ?? []);
        }
      }
      setLoadingExisting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, checking, isAdmin, editBusinessId]);

  // Insert-or-update: documents/media need a real business_id to attach to
  // (storage path is {businessId}/{filename}) — create the row on first
  // upload if it doesn't exist yet; once it exists, this keeps the basics
  // fields in sync with whatever's currently typed, so editing after an
  // upload (or clicking Save with nothing new to upload) isn't silently lost.
  const ensureBusiness = async (): Promise<string | null> => {
    if (!legalName.trim()) {
      toast.error("Fill in the business name first.");
      return null;
    }
    const basics = {
      business_type: businessType,
      legal_business_name: legalName.trim(),
      country: country.trim() || null,
      city: city.trim() || null,
      address: isVenue ? address.trim() || null : null,
      instagram_url: social.instagram_url.trim() || null,
      tiktok_url: social.tiktok_url.trim() || null,
      facebook_url: social.facebook_url.trim() || null,
      youtube_url: social.youtube_url.trim() || null,
      website_url: social.website_url.trim() || null,
      booking_link_url: bookingLinkUrl.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      business_description: description.trim(),
    };
    // The VAT / tax number is kept in a private table, readable only by the owner and admins.
    const savePrivate = async (id: string) => {
      const { error: privError } = await supabase.from("business_private")
        .upsert({ business_id: id, vat_tax_number: vatNumber.trim() || null, updated_at: new Date().toISOString() });
      if (privError) { toast.error(privError.message); return false; }
      return true;
    };
    if (businessId) {
      const { error } = await supabase.from("businesses").update(basics).eq("id", businessId);
      if (error) { toast.error(error.message); return null; }
      return (await savePrivate(businessId)) ? businessId : null;
    }
    const { data, error } = await supabase.from("businesses").insert({ ...basics, user_id: null, verification_status: "verified" }).select("id").single();
    if (error || !data) { toast.error(error?.message ?? "Could not create business"); return null; }
    setBusinessId(data.id);
    return (await savePrivate(data.id)) ? data.id : null;
  };

  const uploadDocuments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const id = await ensureBusiness();
    if (!id) return;
    setUploadingDoc(true);
    for (const file of Array.from(files)) {
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("business-documents").upload(path, file);
      if (uploadError) { toast.error(uploadError.message); continue; }
      const { data: signed } = await supabase.storage.from("business-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) continue;
      const { data: row, error: insertError } = await supabase
        .from("business_documents").insert({ business_id: id, file_name: file.name, file_url: signed.signedUrl })
        .select("id,file_name,file_url").single();
      if (insertError) { toast.error(insertError.message); continue; }
      setDocuments((prev) => [...prev, row]);
    }
    setUploadingDoc(false);
  };

  const removeDocument = async (docId: string) => {
    const { error } = await supabase.from("business_documents").delete().eq("id", docId);
    if (error) return toast.error(error.message);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const uploadMedia = async (files: FileList | null, mediaType: "photo" | "video") => {
    if (!files || files.length === 0) return;
    const id = await ensureBusiness();
    if (!id) return;
    setUploadingMedia(mediaType);
    for (const original of Array.from(files)) {
      const file = mediaType === "photo" ? await preparePhotoForUpload(original) : original;
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file, { cacheControl: "31536000" });
      if (uploadError) { toast.error(uploadError.message); continue; }
      const { data } = supabase.storage.from("business-media").getPublicUrl(path);
      const { data: row, error: insertError } = await supabase
        .from("business_media").insert({ business_id: id, media_type: mediaType, url: data.publicUrl, sort_order: media.length })
        .select("id,media_type,url").single();
      if (insertError) { toast.error(insertError.message); continue; }
      setMedia((prev) => [...prev, row as Media]);
    }
    setUploadingMedia(null);
  };

  const removeMedia = async (mediaId: string) => {
    const { error } = await supabase.from("business_media").delete().eq("id", mediaId);
    if (error) return toast.error(error.message);
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  // The first photo (lowest sort_order) is what every card/carousel shows
  // first — this is the only "thumbnail" concept that exists, so setting one
  // just moves that photo to the front and renumbers sort_order to match.
  const setThumbnail = async (photoId: string) => {
    const photos = media.filter((m) => m.media_type === "photo");
    const rest = media.filter((m) => m.media_type !== "photo");
    const idx = photos.findIndex((m) => m.id === photoId);
    if (idx <= 0) return;
    const reordered = [photos[idx], ...photos.slice(0, idx), ...photos.slice(idx + 1)];
    setMedia([...reordered, ...rest]);
    const results = await Promise.all(reordered.map((m, i) => supabase.from("business_media").update({ sort_order: i }).eq("id", m.id)));
    if (results.some((r) => r.error)) toast.error("Could not save the new photo order.");
  };

  const submit = async () => {
    if (!legalName.trim()) return toast.error("Business name is required.");
    if (!city.trim()) return toast.error("City is required.");
    if (!country.trim()) return toast.error("Country is required.");
    if (media.filter((m) => m.media_type === "photo").length === 0) return toast.error("At least one photo is required.");

    setSaving(true);
    const id = await ensureBusiness();
    if (!id) { setSaving(false); return; }

    if (isVenue) {
      const cleanItems = (items: HeaderBodyItem[]) => items.filter((it) => it.header.trim() || it.body.trim());
      const { error } = await supabase.from("venue_details").upsert({
        business_id: id,
        capacity_min: capacityMin ? Number(capacityMin) : null,
        capacity_max: capacityMax ? Number(capacityMax) : null,
        capacity_seated: capacitySeated ? Number(capacitySeated) : null,
        capacity_standing: capacityStanding ? Number(capacityStanding) : null,
        type_of_space: typeOfSpace,
        facilities_included: facilitiesIncluded,
        facilities_excluded: facilitiesExcluded,
        price_range_min: price ? Number(price) : null,
        price_range_max: price ? Number(price) : null,
        about_sections: cleanItems(aboutSections),
        faqs: cleanItems(faqs),
        price_start_from: startFromAmount ? parseAmountInput(startFromAmount) : null,
        price_start_from_currency: startFromAmount ? startFromCurrency || "USD" : null,
        minimum_spend: minimumSpendAmount ? parseAmountInput(minimumSpendAmount) : null,
        minimum_spend_currency: minimumSpendAmount ? minimumSpendCurrency || "USD" : null,
        price_details: priceDetails.trim() || null,
        price_includes: priceIncludes,
        price_additional_costs: priceAdditionalCosts,
      });
      if (error) { markError(error.message); setSaving(false); return; }
    } else {
      const cleanItems = (items: HeaderBodyItem[]) => items.filter((it) => it.header.trim() || it.body.trim());
      const payload = {
        business_id: id,
        category_ids: categoryIds,
        price_range_min: price ? Number(price) : null,
        price_range_max: price ? Number(price) : null,
        price_start_from: startFromAmount ? parseAmountInput(startFromAmount) : null,
        price_start_from_currency: startFromAmount ? startFromCurrency || "USD" : null,
        minimum_spend: minimumSpendAmount ? parseAmountInput(minimumSpendAmount) : null,
        minimum_spend_currency: minimumSpendAmount ? minimumSpendCurrency || "USD" : null,
        about_sections: cleanItems(aboutSections),
        faqs: cleanItems(faqs),
        price_details: priceDetails.trim() || null,
        price_includes: priceIncludes,
        price_additional_costs: priceAdditionalCosts,
        status: "active" as const,
      };
      const { error } = existingServiceId
        ? await supabase.from("vendor_services").update(payload).eq("id", existingServiceId)
        : await supabase.from("vendor_services").insert(payload);
      if (error) { markError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    if (isEdit) {
      markSaved();
    } else {
      // Back to the admin review list (Approved — a business created here
      // is saved as already verified), not the public marketplace page:
      // that page has no sidebar/nav, which left admins stranded with
      // nowhere to go after adding a listing.
      navigate({ to: isVenue ? "/admin/venues" as any : "/admin/vendors" as any, search: { tab: "approved" } as any });
    }
  };

  if (checking || loadingExisting) return <div />;

  if (!isAdmin || blockedReason) {
    return (
      <div className="rounded-3xl border border-dashed border-line p-16 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="font-serif text-2xl mt-3">{isAdmin ? "Can't edit this listing" : "Admins only"}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{isAdmin ? blockedReason : "You don't have access to this page."}</p>
      </div>
    );
  }

  const photos = media.filter((m) => m.media_type === "photo");
  const videos = media.filter((m) => m.media_type === "video");

  return (
    <div className="max-w-2xl grid gap-6">
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground -mb-1">Only fields marked * are required. Everything else here is optional.</p>
        <Field label="Legal business name" required>
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Sunset Weddings LLC"
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="VAT / tax number">
            <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
          </Field>
          <Field label="Country" required>
            <div className="mt-1">
              <Dropdown value={country} onChange={setCountry} placeholder="Select a country…" searchable
                options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
            </div>
          </Field>
        </div>
        <div className={isVenue ? "grid grid-cols-2 gap-4" : undefined}>
          <Field label="City" required>
            <div className="mt-1">
              <Dropdown value={city} onChange={setCity} placeholder="Select or add a city…" searchable allowCustom
                options={cityOptions.map((c) => ({ value: c, label: c }))} />
            </div>
          </Field>
          {isVenue && (
            <Field label="Address">
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address"
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </Field>
          )}
        </div>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
        </Field>
      </div>

      {isVenue ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Capacity (min guests)">
              <input type="number" value={capacityMin} onChange={(e) => setCapacityMin(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </Field>
            <Field label="Capacity (max guests)">
              <input type="number" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seated capacity">
              <input type="number" value={capacitySeated} onChange={(e) => setCapacitySeated(e.target.value)}
                placeholder="e.g. 80"
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </Field>
            <Field label="Standing capacity">
              <input type="number" value={capacityStanding} onChange={(e) => setCapacityStanding(e.target.value)}
                placeholder="e.g. 150"
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            </Field>
          </div>
          <Field label="Type of space">
            <div className="mt-2"><ChipToggleGroup options={TYPE_OF_SPACE_OPTIONS} selected={typeOfSpace} onChange={setTypeOfSpace} allowCustom /></div>
          </Field>
          <Field label="Facilities included">
            <div className="mt-2"><TagListInput tags={facilitiesIncluded} onChange={setFacilitiesIncluded} /></div>
          </Field>
          <Field label="Facilities excluded">
            <div className="mt-2"><TagListInput tags={facilitiesExcluded} onChange={setFacilitiesExcluded} /></div>
          </Field>
          <Field label="Price">
            <p className="text-sm text-muted-foreground -mt-0.5 mb-2">Used for marketplace filtering and the $ shown on cards.</p>
            <PriceTierPicker value={price} onChange={setPrice} />
          </Field>
          <div className="grid gap-4 rounded-2xl border border-line p-4">
            <p className="text-sm uppercase tracking-widest text-muted-foreground -mb-1">Pricing details (shown on the venue page)</p>
            <AmountCurrencyField label="Starting price" amount={startFromAmount} onAmountChange={setStartFromAmount}
              currency={startFromCurrency} onCurrencyChange={setStartFromCurrency} />
            <AmountCurrencyField label="Minimum spend" amount={minimumSpendAmount} onAmountChange={setMinimumSpendAmount}
              currency={minimumSpendCurrency} onCurrencyChange={setMinimumSpendCurrency} />
            <p className="text-sm text-muted-foreground -mb-1">e.g. "Based on a weekday wedding in November."</p>
            <textarea value={priceDetails} onChange={(e) => setPriceDetails(e.target.value)} rows={2}
              placeholder="A short line under the starting price…"
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
            <Field label="Starting price includes">
              <div className="mt-2"><TagListInput tags={priceIncludes} onChange={setPriceIncludes} placeholder="e.g. Exclusive hire for two nights" /></div>
            </Field>
            <Field label="Additional costs">
              <div className="mt-2"><TagListInput tags={priceAdditionalCosts} onChange={setPriceAdditionalCosts} placeholder="e.g. Ceremony fees" /></div>
            </Field>
          </div>
          <Field label="About sections">
            <p className="text-sm text-muted-foreground -mt-0.5 mb-2">
              Each one gets its own heading on the venue page, e.g. "Getting there" with directions. Leave empty and the plain description above is shown instead.
            </p>
            <HeaderBodyListEditor items={aboutSections} onChange={setAboutSections}
              headerLabel="Heading" bodyLabel="Details" headerPlaceholder="e.g. Getting there" bodyPlaceholder="e.g. 10 minutes from Dubai International Airport…"
              addLabel="Add an About section" />
          </Field>
          <Field label="FAQ">
            <div className="mt-2">
              <HeaderBodyListEditor items={faqs} onChange={setFaqs}
                headerLabel="Question" bodyLabel="Answer" headerPlaceholder="e.g. Is outside catering allowed?" bodyPlaceholder="Answer…"
                addLabel="Add a question" />
            </div>
          </Field>
        </div>
      ) : (
        <div className="grid gap-4">
          {!isEdit && <p className="text-sm text-muted-foreground -mb-1">This is what makes the vendor appear in the directory. The claimed owner can edit it later.</p>}
          <Field label="Categories">
            <p className="text-sm text-muted-foreground -mt-0.5 mb-2">Search to find one, or add it if it's not in the list yet. Pick as many as apply.</p>
            <SearchableMultiSelect selected={categoryIds} onChange={setCategoryIds} placeholder="Pick categories…"
              options={categories} onCreate={createCategory} createLabel="Add category" inline />
          </Field>
          <Field label="Price">
            <p className="text-sm text-muted-foreground -mt-0.5 mb-2">Used for marketplace filtering and the $ shown on cards.</p>
            <PriceTierPicker value={price} onChange={setPrice} />
          </Field>
          <div className="grid gap-4 rounded-2xl border border-line p-4">
            <p className="text-sm uppercase tracking-widest text-muted-foreground -mb-1">Pricing details (shown on the vendor page)</p>
            <AmountCurrencyField label="Starting price" amount={startFromAmount} onAmountChange={setStartFromAmount}
              currency={startFromCurrency} onCurrencyChange={setStartFromCurrency} />
            <AmountCurrencyField label="Minimum spend" amount={minimumSpendAmount} onAmountChange={setMinimumSpendAmount}
              currency={minimumSpendCurrency} onCurrencyChange={setMinimumSpendCurrency} />
            <p className="text-sm text-muted-foreground -mb-1">e.g. "Based on a weekday, off-peak booking."</p>
            <textarea value={priceDetails} onChange={(e) => setPriceDetails(e.target.value)} rows={2}
              placeholder="A short line under the starting price…"
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
            <Field label="Starting price includes">
              <div className="mt-2"><TagListInput tags={priceIncludes} onChange={setPriceIncludes} placeholder="e.g. Full-day coverage" /></div>
            </Field>
            <Field label="Additional costs">
              <div className="mt-2"><TagListInput tags={priceAdditionalCosts} onChange={setPriceAdditionalCosts} placeholder="e.g. Travel fees" /></div>
            </Field>
          </div>
          <Field label="About sections">
            <p className="text-sm text-muted-foreground -mt-0.5 mb-2">
              Each one gets its own heading on the vendor page, e.g. "Our approach" with more detail. Leave empty and the plain description above is shown instead.
            </p>
            <HeaderBodyListEditor items={aboutSections} onChange={setAboutSections}
              headerLabel="Heading" bodyLabel="Details" headerPlaceholder="e.g. Our approach" bodyPlaceholder="e.g. We start with a call to understand your vision…"
              addLabel="Add an About section" />
          </Field>
          <Field label="FAQ">
            <div className="mt-2">
              <HeaderBodyListEditor items={faqs} onChange={setFaqs}
                headerLabel="Question" bodyLabel="Answer" headerPlaceholder="e.g. How far in advance should we book?" bodyPlaceholder="Answer…"
                addLabel="Add a question" />
            </div>
          </Field>
        </div>
      )}

      <div className="grid gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Documents</p>
          <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
            <input type="file" multiple hidden onChange={(e) => uploadDocuments(e.target.files)} />
            <FileText className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-sm mt-2">{uploadingDoc ? "Uploading…" : "Click to upload documents"}</p>
          </label>
          {documents.length > 0 && (
            <ul className="mt-2 grid gap-1.5">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-sm min-w-0"><FileText className="h-3.5 w-3.5 text-clay shrink-0" /><span className="truncate">{d.file_name}</span></span>
                  <button onClick={() => removeDocument(d.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Photos<span className="text-cherry ml-0.5">*</span></p>
          <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
            <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadMedia(e.target.files, "photo")} />
            <p className="text-sm">{uploadingMedia === "photo" ? "Uploading…" : "Click to upload photos"}</p>
          </label>
          {photos.length > 0 && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">The starred photo is the thumbnail shown on cards. Hover another and click its star to switch.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
              {photos.map((m, i) => (
                <div key={m.id} className="relative h-20 w-20 rounded-lg overflow-hidden border border-line group bg-stone">
                  <img src={m.url} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => setThumbnail(m.id)} disabled={i === 0}
                    title={i === 0 ? "Thumbnail photo" : "Set as thumbnail"}
                    className={cn(
                      "absolute top-1 left-1 h-5 w-5 rounded-full grid place-items-center transition-opacity",
                      i === 0 ? "bg-cherry text-pearl opacity-100" : "bg-ink/70 text-pearl opacity-0 group-hover:opacity-100 cursor-pointer hover:bg-cherry",
                    )}>
                    <Star className={cn("h-3 w-3", i === 0 && "fill-current")} />
                  </button>
                  <button type="button" onClick={() => removeMedia(m.id)} title="Remove"
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-ink/70 text-pearl opacity-0 group-hover:opacity-100 grid place-items-center cursor-pointer hover:bg-cherry">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              </div>
            </>
          )}

          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 mt-4">Video</p>
          <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
            <input type="file" accept="video/*" multiple hidden onChange={(e) => uploadMedia(e.target.files, "video")} />
            <p className="text-sm">{uploadingMedia === "video" ? "Uploading…" : "Click to upload video"}</p>
          </label>
          {videos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {videos.map((m) => (
                <div key={m.id} className="relative h-16 w-16 rounded-lg overflow-hidden border border-line group bg-stone grid place-items-center">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <button onClick={() => removeMedia(m.id)} className="absolute inset-0 bg-ink/60 text-pearl opacity-0 group-hover:opacity-100 grid place-items-center cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SocialLinksFields values={social} onChange={(key, value) => setSocial((prev) => ({ ...prev, [key]: value }))} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact email" optional>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@venue.com"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </Field>
        <Field label="Contact phone" optional>
          <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+44 7700 900000"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </Field>
      </div>

      <Field label="Booking link" optional>
        <p className="text-sm text-muted-foreground -mt-0.5 mb-1">A Calendly (or similar) link. When set, "Book a viewing" sends couples straight there instead of the in-app request form.</p>
        <input value={bookingLinkUrl} onChange={(e) => setBookingLinkUrl(e.target.value)} placeholder="https://calendly.com/…"
          className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      </Field>

      <div>
        <button onClick={submit} disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium disabled:opacity-60 cursor-pointer transition-colors",
            saveStatus === "saved" ? "bg-sage-deep text-paper"
              : saveStatus === "error" ? "bg-cherry text-paper"
              : "bg-ink text-paper hover:bg-clay",
          )}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…"
            : isEdit ? (saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Couldn't save" : "Save changes")
            : `Add ${isVenue ? "venue" : "vendor"} (unclaimed)`}
        </button>
        {saveStatus === "error" && saveError && <p className="mt-2 text-sm text-cherry">{saveError}</p>}
      </div>
    </div>
  );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm uppercase tracking-widest text-muted-foreground">
        {label}{required && <span className="text-cherry ml-0.5">*</span>}{optional && <span className="normal-case tracking-normal text-muted-foreground/70"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}
