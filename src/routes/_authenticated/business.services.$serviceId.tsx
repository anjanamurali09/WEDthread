import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { SearchableMultiSelect } from "@/components/searchable-multi-select";
import { useVendorCategories } from "@/hooks/use-vendor-categories";
import { PriceTierPicker } from "@/components/price-tier-picker";
import { AmountCurrencyField } from "@/components/amount-currency-field";
import { TagListInput } from "@/components/tag-list-input";
import { HeaderBodyListEditor, type HeaderBodyItem } from "@/components/header-body-list-editor";
import { formatAmountInput, parseAmountInput } from "@/lib/currency";
import { toast } from "sonner";
import { useSavedFeedback } from "@/hooks/use-saved-feedback";
import { Loader2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VendorLeadFormBuilder } from "@/components/vendor-lead-form-builder";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/business/services/$serviceId")({ component: ServiceFormPage });

type Media = { id: string; media_type: "photo" | "video"; url: string };

function ServiceFormPage() {
  const navigate = useNavigate();
  const { serviceId } = Route.useParams();
  const isNew = serviceId === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { categories, createCategory } = useVendorCategories();

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [startFromAmount, setStartFromAmount] = useState("");
  const [startFromCurrency, setStartFromCurrency] = useState("");
  const [minimumSpendAmount, setMinimumSpendAmount] = useState("");
  const [minimumSpendCurrency, setMinimumSpendCurrency] = useState("");
  const [priceDetails, setPriceDetails] = useState("");
  const [priceIncludes, setPriceIncludes] = useState<string[]>([]);
  const [priceAdditionalCosts, setPriceAdditionalCosts] = useState<string[]>([]);
  const [aboutSections, setAboutSections] = useState<HeaderBodyItem[]>([]);
  const [faqs, setFaqs] = useState<HeaderBodyItem[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const { status: saveStatus, markSaved, markError } = useSavedFeedback();

  const [media, setMedia] = useState<Media[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState<"photo" | "video" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: business } = await supabase.from("businesses").select("id").eq("user_id", u.user.id).eq("business_type", "vendor").maybeSingle();
      if (!business) {
        toast.error("Set up your business profile first.");
        navigate({ to: "/business/onboarding" as any, replace: true });
        return;
      }
      setBusinessId(business.id);

      if (!isNew) {
        const { data: service } = await supabase.from("vendor_services").select("*").eq("id", serviceId).eq("business_id", business.id).maybeSingle();
        if (!service) {
          toast.error("Listing not found.");
          navigate({ to: "/business/dashboard" as any, replace: true });
          return;
        }
        setCategoryIds(service.category_ids ?? []);
        setDescription(service.description ?? "");
        setPrice(service.price_range_min != null ? String(service.price_range_min) : "");
        setStartFromCurrency(service.price_start_from_currency ?? "");
        setStartFromAmount(service.price_start_from != null ? formatAmountInput(String(service.price_start_from), service.price_start_from_currency ?? "USD") : "");
        setMinimumSpendCurrency(service.minimum_spend_currency ?? "");
        setMinimumSpendAmount(service.minimum_spend != null ? formatAmountInput(String(service.minimum_spend), service.minimum_spend_currency ?? "USD") : "");
        setPriceDetails(service.price_details ?? "");
        setPriceIncludes(service.price_includes ?? []);
        setPriceAdditionalCosts(service.price_additional_costs ?? []);
        setAboutSections(Array.isArray(service.about_sections) ? (service.about_sections as unknown as HeaderBodyItem[]) : []);
        setFaqs(Array.isArray(service.faqs) ? (service.faqs as unknown as HeaderBodyItem[]) : []);
        setStatus(service.status);
        const { data: med } = await supabase.from("business_media").select("id,media_type,url").eq("listing_id", service.id).order("sort_order");
        setMedia((med ?? []) as Media[]);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const save = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const cleanItems = (items: HeaderBodyItem[]) => items.filter((it) => it.header.trim() || it.body.trim());
      const payload = {
        business_id: businessId,
        category_ids: categoryIds,
        description: description.trim() || null,
        price_range_min: price ? Number(price) : null,
        price_range_max: price ? Number(price) : null,
        price_start_from: startFromAmount ? parseAmountInput(startFromAmount) : null,
        price_start_from_currency: startFromAmount ? startFromCurrency || "USD" : null,
        minimum_spend: minimumSpendAmount ? parseAmountInput(minimumSpendAmount) : null,
        minimum_spend_currency: minimumSpendAmount ? minimumSpendCurrency || "USD" : null,
        price_details: priceDetails.trim() || null,
        price_includes: priceIncludes,
        price_additional_costs: priceAdditionalCosts,
        about_sections: cleanItems(aboutSections),
        faqs: cleanItems(faqs),
        status,
      };
      if (isNew) {
        const { data, error } = await supabase.from("vendor_services").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Listing created — now add some photos.");
        navigate({ to: `/business/services/${data.id}` as any, replace: true });
      } else {
        const { error } = await supabase.from("vendor_services").update(payload).eq("id", serviceId);
        if (error) throw error;
        markSaved();
      }
    } catch (err: any) {
      markError(err.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const uploadMedia = async (files: FileList | null, mediaType: "photo" | "video") => {
    if (!files || files.length === 0 || isNew || !businessId) return;
    setUploadingMedia(mediaType);
    for (const file of Array.from(files)) {
      const path = `${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("business-media").upload(path, file);
      if (uploadError) { toast.error(uploadError.message); continue; }
      const { data } = supabase.storage.from("business-media").getPublicUrl(path);
      const { data: row, error: insertError } = await supabase
        .from("business_media")
        .insert({ business_id: businessId, listing_id: serviceId, media_type: mediaType, url: data.publicUrl, sort_order: media.length })
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

  if (loading) return <AppShell title="Loading…"><div /></AppShell>;

  const detailsForm = (
    <div className="grid gap-5">
      <Field label="Categories">
        <p className="text-sm text-muted-foreground -mt-0.5 mb-2">Search to find one, or add it if it's not in the list yet. Pick as many as apply.</p>
        <SearchableMultiSelect selected={categoryIds} onChange={setCategoryIds} placeholder="Pick categories…"
          options={categories} onCreate={createCategory} createLabel="Add category" inline />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
      </Field>
      <Field label="Price">
        <p className="text-sm text-muted-foreground -mt-0.5 mb-2">Used for marketplace filtering and the $ shown on cards.</p>
        <PriceTierPicker value={price} onChange={setPrice} />
      </Field>
      <div className="grid gap-4 rounded-2xl border border-line p-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground -mb-1">Pricing details (shown on your vendor page)</p>
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
          Each one gets its own heading on your vendor page — e.g. "Our approach" with more detail. Leave empty and your plain description above is shown instead.
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
      <Field label="Status">
        <div className="mt-1 inline-flex rounded-full border border-line p-0.5">
          {(["active", "inactive"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize cursor-pointer ${status === s ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink"}`}>
              {s}
            </button>
          ))}
        </div>
      </Field>

      <div>
        <button onClick={save} disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium disabled:opacity-60 cursor-pointer transition-colors",
            !isNew && saveStatus === "saved" ? "bg-sage-deep text-paper"
              : !isNew && saveStatus === "error" ? "bg-cherry text-paper"
              : "bg-ink text-paper hover:bg-clay",
          )}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isNew
            ? "Create listing"
            : saving ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Couldn't save" : "Save changes"}
        </button>
      </div>
    </div>
  );

  const mediaSection = (
    <div>
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Photos</p>
      <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
        <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadMedia(e.target.files, "photo")} />
        <p className="text-sm">{uploadingMedia === "photo" ? "Uploading…" : "Click to upload photos"}</p>
      </label>
      <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2 mt-4">Video</p>
      <label className="rounded-2xl border border-dashed border-line p-6 text-center cursor-pointer hover:border-cherry transition-colors block">
        <input type="file" accept="video/*" multiple hidden onChange={(e) => uploadMedia(e.target.files, "video")} />
        <p className="text-sm">{uploadingMedia === "video" ? "Uploading…" : "Click to upload video"}</p>
      </label>
      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
          {media.map((m) => (
            <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden border border-line group bg-stone">
              {m.media_type === "photo" ? (
                <img src={m.url} className="w-full h-full object-cover" alt="" />
              ) : (
                <video src={m.url} className="w-full h-full object-cover" />
              )}
              <button onClick={() => removeMedia(m.id)}
                className="absolute inset-0 bg-ink/60 text-pearl opacity-0 group-hover:opacity-100 grid place-items-center cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AppShell title={isNew ? "Add your listing" : "Edit your listing"} subtitle="Categories, pricing, photos, and lead form — your business name and documents stay shared.">
      {isNew ? (
        <div className="max-w-2xl">{detailsForm}</div>
      ) : (
        <Tabs defaultValue="details" className="max-w-2xl">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="lead-form">Lead form</TabsTrigger>
          </TabsList>
          <TabsContent value="details">{detailsForm}</TabsContent>
          <TabsContent value="media">{mediaSection}</TabsContent>
          <TabsContent value="lead-form">
            {businessId && <VendorLeadFormBuilder businessId={businessId} vendorServiceId={serviceId} categoryId={categoryIds[0] ?? null} />}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm uppercase tracking-widest text-muted-foreground">{label}{required && <span className="text-cherry ml-0.5">*</span>}</span>
      {children}
    </label>
  );
}
