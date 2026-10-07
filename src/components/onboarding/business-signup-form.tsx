import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { addRoleForCurrentUser } from "@/hooks/use-active-role";
import { toast } from "@/lib/toast";
import { Loader2, FileText, X, Video, ArrowRight, ArrowLeft } from "lucide-react";
import { ChipToggleGroup } from "@/components/chip-toggle-group";
import { TagListInput } from "@/components/tag-list-input";
import { PriceTierPicker } from "@/components/price-tier-picker";
import { SocialLinksFields, EMPTY_SOCIAL_LINKS, type SocialLinkValues } from "@/components/social-links";
import { VendorLeadFormBuilder } from "@/components/vendor-lead-form-builder";

type Document = { id: string; file_name: string; file_url: string };
type Media = { id: string; media_type: "photo" | "video"; url: string };

const VENDOR_STEPS = ["Business basics", "Documents", "Media"] as const;
const VENUE_STEPS = ["Business basics", "Documents", "Media", "Venue details", "Lead form"] as const;

const TYPE_OF_SPACE_OPTIONS = ["Indoor", "Outdoor", "Poolside", "Banquet hall", "Rooftop", "Farmhouse", "Beach"];

// Same page chrome as the couple onboarding form (src/routes/_authenticated/onboarding.tsx)
// and the same Field/input styling — this is the closest existing "step" of a signup flow
// in the app; there's no pre-existing multi-step wizard component to extend, so this builds
// its own 3-step state machine while keeping the visual language identical.
export function BusinessSignupForm({ businessType = "vendor" as const }: { businessType?: "vendor" | "venue" }) {
  const navigate = useNavigate();
  const isVenue = businessType === "venue";
  const STEPS = isVenue ? VENUE_STEPS : VENDOR_STEPS;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [social, setSocial] = useState<SocialLinkValues>(EMPTY_SOCIAL_LINKS);
  const [bookingLinkUrl, setBookingLinkUrl] = useState("");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [media, setMedia] = useState<Media[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState<"photo" | "video" | null>(null);

  const [capacityMin, setCapacityMin] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [typeOfSpace, setTypeOfSpace] = useState<string[]>([]);
  const [facilitiesIncluded, setFacilitiesIncluded] = useState<string[]>([]);
  const [facilitiesExcluded, setFacilitiesExcluded] = useState<string[]>([]);
  const [venuePrice, setVenuePrice] = useState("");
  const [savingVenueDetails, setSavingVenueDetails] = useState(false);

  // Resume an in-progress draft rather than creating a second business row —
  // a couple/vendor closing the tab mid-wizard and coming back shouldn't lose
  // what they already filled in or uploaded.
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: existing } = await supabase
        .from("businesses").select("*")
        .eq("user_id", u.user.id).eq("business_type", businessType)
        .maybeSingle();
      if (existing) {
        setBusinessId(existing.id);
        setLegalName(existing.legal_business_name);
        const { data: priv } = await supabase.from("business_private").select("vat_tax_number").eq("business_id", existing.id).maybeSingle();
        setVatNumber(priv?.vat_tax_number ?? "");
        setDescription(existing.business_description);
        setCountry(existing.country ?? "");
        setCity(existing.city ?? "");
        setAddress(existing.address ?? "");
        setSocial({
          instagram_url: existing.instagram_url ?? "",
          tiktok_url: existing.tiktok_url ?? "",
          facebook_url: existing.facebook_url ?? "",
          youtube_url: existing.youtube_url ?? "",
          website_url: existing.website_url ?? "",
        });
        setBookingLinkUrl(existing.booking_link_url ?? "");
        const [{ data: docs }, { data: med }] = await Promise.all([
          supabase.from("business_documents").select("id,file_name,file_url").eq("business_id", existing.id),
          supabase.from("business_media").select("id,media_type,url").eq("business_id", existing.id).order("sort_order"),
        ]);
        setDocuments(docs ?? []);
        setMedia((med ?? []) as Media[]);

        if (businessType === "venue") {
          const { data: details } = await supabase.from("venue_details").select("*").eq("business_id", existing.id).maybeSingle();
          if (details) {
            setCapacityMin(details.capacity_min != null ? String(details.capacity_min) : "");
            setCapacityMax(details.capacity_max != null ? String(details.capacity_max) : "");
            setTypeOfSpace(details.type_of_space ?? []);
            setFacilitiesIncluded(details.facilities_included ?? []);
            setFacilitiesExcluded(details.facilities_excluded ?? []);
            setVenuePrice(details.price_range_min != null ? String(details.price_range_min) : "");
          }
        }
      }
      setLoading(false);
    })();
  }, [businessType]);

  const saveBasics = async () => {
    if (!legalName.trim() || !description.trim()) {
      toast.error("Business name and description are required.");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload = {
        user_id: u.user.id,
        business_type: businessType,
        legal_business_name: legalName.trim(),
        business_description: description.trim(),
        country: country.trim() || null,
        city: city.trim() || null,
        address: isVenue ? address.trim() || null : null,
        instagram_url: social.instagram_url.trim() || null,
        tiktok_url: social.tiktok_url.trim() || null,
        facebook_url: social.facebook_url.trim() || null,
        youtube_url: social.youtube_url.trim() || null,
        website_url: social.website_url.trim() || null,
        booking_link_url: bookingLinkUrl.trim() || null,
      };
      let savedId = businessId;
      if (businessId) {
        const { error } = await supabase.from("businesses").update(payload).eq("id", businessId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("businesses").insert(payload).select("id").single();
        if (error) throw error;
        savedId = data.id;
        setBusinessId(data.id);
      }
      // The VAT / tax number is kept in a private table, readable only by you and admins.
      const { error: privError } = await supabase.from("business_private")
        .upsert({ business_id: savedId!, vat_tax_number: vatNumber.trim() || null, updated_at: new Date().toISOString() });
      if (privError) throw privError;
      setStep(2);
    } catch (err: any) {
      toast.error(err.message ?? "Could not save — try again");
    } finally {
      setSaving(false);
    }
  };

  const uploadDocuments = async (files: FileList | null) => {
    if (!files || files.length === 0 || !businessId) return;
    setUploadingDoc(true);
    setDocumentError(null);
    for (const file of Array.from(files)) {
      const path = `${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("business-documents").upload(path, file);
      if (uploadError) { toast.error(uploadError.message); continue; }
      const { data: signed } = await supabase.storage.from("business-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) continue;
      const { data: row, error: insertError } = await supabase
        .from("business_documents")
        .insert({ business_id: businessId, file_name: file.name, file_url: signed.signedUrl })
        .select("id,file_name,file_url").single();
      if (insertError) { toast.error(insertError.message); continue; }
      setDocuments((prev) => [...prev, row]);
    }
    setUploadingDoc(false);
  };

  const removeDocument = async (id: string) => {
    const { error } = await supabase.from("business_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const continueFromDocuments = () => {
    if (documents.length === 0) {
      setDocumentError("Upload at least one document before continuing.");
      return;
    }
    setDocumentError(null);
    setStep(3);
  };

  const uploadMedia = async (files: FileList | null, mediaType: "photo" | "video") => {
    if (!files || files.length === 0 || !businessId) return;
    setUploadingMedia(mediaType);
    for (const file of Array.from(files)) {
      const path = `${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file);
      if (uploadError) { toast.error(uploadError.message); continue; }
      const { data } = supabase.storage.from("business-media").getPublicUrl(path);
      const { data: row, error: insertError } = await supabase
        .from("business_media")
        .insert({ business_id: businessId, media_type: mediaType, url: data.publicUrl, sort_order: media.length })
        .select("id,media_type,url").single();
      if (insertError) { toast.error(insertError.message); continue; }
      setMedia((prev) => [...prev, row as Media]);
    }
    setUploadingMedia(null);
  };

  const removeMedia = async (id: string) => {
    const { error } = await supabase.from("business_media").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const finish = async () => {
    setSaving(true);
    try {
      await addRoleForCurrentUser(businessType);
      // Everything about the submission (business row, documents, media,
      // venue details, lead form) is already saved by this point — this is
      // purely the email-notify side of it, and must never block the
      // couple/vendor's own success path if it fails.
      if (businessId) {
        supabase.functions.invoke("notify-business-submission", {
          body: { business_id: businessId, origin: window.location.origin },
        }).catch((err) => console.error("notify-business-submission failed", err));
      }
      toast.success("Business profile submitted for review.");
      navigate({ to: "/business/dashboard" as any });
    } catch (err: any) {
      toast.error(err.message ?? "Could not finish setup");
    } finally {
      setSaving(false);
    }
  };

  const saveVenueDetails = async () => {
    if (!businessId) return;
    setSavingVenueDetails(true);
    const { error } = await supabase.from("venue_details").upsert({
      business_id: businessId,
      capacity_min: capacityMin ? Number(capacityMin) : null,
      capacity_max: capacityMax ? Number(capacityMax) : null,
      type_of_space: typeOfSpace,
      facilities_included: facilitiesIncluded,
      facilities_excluded: facilitiesExcluded,
      price_range_min: venuePrice ? Number(venuePrice) : null,
      price_range_max: venuePrice ? Number(venuePrice) : null,
    });
    setSavingVenueDetails(false);
    if (error) return toast.error(error.message);
    setStep(5);
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-pearl"><p className="text-sm text-muted-foreground">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <span className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-cherry" : "bg-line"}`} />
              </div>
            );
          })}
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-clay">Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>

        {step === 1 && (
          <>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">Tell us about your business.</h1>
            <p className="mt-3 text-muted-foreground">This is what couples and our review team will see first.</p>
            <div className="mt-10 grid gap-5">
              <Field label="Legal business name" required>
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Sunset Weddings LLC"
                  className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              </Field>
              <Field label="VAT / tax number" optional>
                <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="e.g. TRN 100234567800003"
                  className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              </Field>
              <Field label="Country" optional>
                <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United Arab Emirates"
                  className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              </Field>
              <Field label="City" optional>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Dubai"
                  className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              </Field>
              {isVenue && (
                <Field label="Address" optional>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address"
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                </Field>
              )}
              <SocialLinksFields values={social} onChange={(key, value) => setSocial((prev) => ({ ...prev, [key]: value }))} />
              <Field label="Booking link" optional>
                <p className="text-sm text-muted-foreground -mt-0.5 mb-1">A Calendly (or similar) link — when set, "Book a viewing" sends couples straight there instead of the in-app request form.</p>
                <input value={bookingLinkUrl} onChange={(e) => setBookingLinkUrl(e.target.value)} placeholder="https://calendly.com/…"
                  className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              </Field>
              <Field label="Business description" required>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                  placeholder="What do you offer, and what makes your business a good fit for weddings?"
                  className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
              </Field>
              <div className="mt-4">
                <button onClick={saveBasics} disabled={saving}
                  className="inline-flex justify-center items-center gap-2 rounded-full bg-ink text-paper px-8 py-3.5 text-sm font-medium hover:bg-clay disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">Verify your business.</h1>
            <p className="mt-3 text-muted-foreground">Upload at least one document — a trade license, tax certificate, or similar.</p>
            <div className="mt-10 grid gap-4">
              <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
                <input type="file" multiple hidden onChange={(e) => uploadDocuments(e.target.files)} />
                <FileText className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm mt-2">{uploadingDoc ? "Uploading…" : "Click to upload documents"}</p>
              </label>
              {documentError && <p className="text-sm text-destructive">{documentError}</p>}
              {documents.length > 0 && (
                <ul className="grid gap-2">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-sm min-w-0">
                        <FileText className="h-4 w-4 text-clay shrink-0" />
                        <span className="truncate">{d.file_name}</span>
                      </span>
                      <button onClick={() => removeDocument(d.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm hover:bg-cream cursor-pointer">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={continueFromDocuments}
                  className="inline-flex justify-center items-center gap-2 rounded-full bg-ink text-paper px-8 py-3.5 text-sm font-medium hover:bg-clay cursor-pointer">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">Show your work.</h1>
            <p className="mt-3 text-muted-foreground">Add photos and video — you can always add more later.</p>
            <div className="mt-10 grid gap-6">
              <div>
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Photos</p>
                <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadMedia(e.target.files, "photo")} />
                  <p className="text-sm">{uploadingMedia === "photo" ? "Uploading…" : "Click to upload photos"}</p>
                </label>
                {media.filter((m) => m.media_type === "photo").length > 0 && (
                  <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
                    {media.filter((m) => m.media_type === "photo").map((m) => (
                      <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden border border-line group">
                        <img src={m.url} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => removeMedia(m.id)}
                          className="absolute inset-0 bg-ink/60 text-pearl opacity-0 group-hover:opacity-100 text-sm cursor-pointer">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Video</p>
                <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
                  <input type="file" accept="video/*" multiple hidden onChange={(e) => uploadMedia(e.target.files, "video")} />
                  <p className="text-sm">{uploadingMedia === "video" ? "Uploading…" : "Click to upload video"}</p>
                </label>
                {media.filter((m) => m.media_type === "video").length > 0 && (
                  <ul className="mt-3 grid gap-2">
                    {media.filter((m) => m.media_type === "video").map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm min-w-0">
                          <Video className="h-4 w-4 text-clay shrink-0" /> <span className="truncate">{m.url.split("/").pop()}</span>
                        </span>
                        <button onClick={() => removeMedia(m.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><X className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm hover:bg-cream cursor-pointer">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {isVenue ? (
                  <button onClick={() => setStep(4)}
                    className="inline-flex justify-center items-center gap-2 rounded-full bg-ink text-paper px-8 py-3.5 text-sm font-medium hover:bg-clay cursor-pointer">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={finish} disabled={saving}
                    className="inline-flex justify-center items-center gap-2 rounded-full bg-cherry text-pearl px-8 py-3.5 text-sm font-medium hover:bg-wine disabled:opacity-60 cursor-pointer">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {step === 4 && isVenue && (
          <>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">Tell us about the space.</h1>
            <p className="mt-3 text-muted-foreground">Capacity, type of space, and what's included — this is what couples filter by.</p>
            <div className="mt-10 grid gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Capacity — min guests" optional>
                  <input type="number" value={capacityMin} onChange={(e) => setCapacityMin(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                </Field>
                <Field label="Capacity — max guests" optional>
                  <input type="number" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                </Field>
              </div>
              <Field label="Type of space" optional>
                <div className="mt-2"><ChipToggleGroup options={TYPE_OF_SPACE_OPTIONS} selected={typeOfSpace} onChange={setTypeOfSpace} /></div>
              </Field>
              <Field label="Facilities included" optional>
                <div className="mt-2"><TagListInput tags={facilitiesIncluded} onChange={setFacilitiesIncluded} placeholder="e.g. In-house catering" /></div>
              </Field>
              <Field label="Facilities excluded" optional>
                <div className="mt-2"><TagListInput tags={facilitiesExcluded} onChange={setFacilitiesExcluded} placeholder="e.g. Alcohol license" /></div>
              </Field>
              <Field label="Price" optional>
                <div className="mt-2"><PriceTierPicker value={venuePrice} onChange={setVenuePrice} /></div>
              </Field>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm hover:bg-cream cursor-pointer">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={saveVenueDetails} disabled={savingVenueDetails}
                  className="inline-flex justify-center items-center gap-2 rounded-full bg-ink text-paper px-8 py-3.5 text-sm font-medium hover:bg-clay disabled:opacity-60 cursor-pointer">
                  {savingVenueDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 5 && isVenue && businessId && (
          <>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">What should couples tell you?</h1>
            <p className="mt-3 text-muted-foreground">This is the form a couple fills in when they enquire about your venue.</p>
            <div className="mt-10">
              <VendorLeadFormBuilder businessId={businessId} vendorServiceId={null} categoryId={null} />
              <div className="mt-6 flex items-center gap-3">
                <button onClick={() => setStep(4)} className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm hover:bg-cream cursor-pointer">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={finish} disabled={saving}
                  className="inline-flex justify-center items-center gap-2 rounded-full bg-cherry text-pearl px-8 py-3.5 text-sm font-medium hover:bg-wine disabled:opacity-60 cursor-pointer">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm uppercase tracking-widest text-muted-foreground">
        {label}
        {required && <span className="text-cherry ml-0.5">*</span>}
        {optional && <span className="normal-case tracking-normal text-muted-foreground/70"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}
