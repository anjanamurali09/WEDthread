import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ChipToggleGroup } from "@/components/chip-toggle-group";
import { TagListInput } from "@/components/tag-list-input";
import { PriceTierPicker } from "@/components/price-tier-picker";
import { AmountCurrencyField } from "@/components/amount-currency-field";
import { HeaderBodyListEditor, type HeaderBodyItem } from "@/components/header-body-list-editor";
import { VendorLeadFormBuilder } from "@/components/vendor-lead-form-builder";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { useSavedFeedback } from "@/hooks/use-saved-feedback";
import { formatAmountInput, parseAmountInput } from "@/lib/currency";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/business/venue-details")({ component: VenueDetailsPage });

const TYPE_OF_SPACE_OPTIONS = ["Indoor", "Outdoor", "Poolside", "Banquet hall", "Rooftop", "Farmhouse", "Beach"];

function VenueDetailsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [capacityMin, setCapacityMin] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [capacitySeated, setCapacitySeated] = useState("");
  const [capacityStanding, setCapacityStanding] = useState("");
  const [typeOfSpace, setTypeOfSpace] = useState<string[]>([]);
  const [facilitiesIncluded, setFacilitiesIncluded] = useState<string[]>([]);
  const [facilitiesExcluded, setFacilitiesExcluded] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [aboutSections, setAboutSections] = useState<HeaderBodyItem[]>([]);
  const [faqs, setFaqs] = useState<HeaderBodyItem[]>([]);
  const [startFromAmount, setStartFromAmount] = useState("");
  const [startFromCurrency, setStartFromCurrency] = useState("");
  const [minimumSpendAmount, setMinimumSpendAmount] = useState("");
  const [minimumSpendCurrency, setMinimumSpendCurrency] = useState("");
  const [priceDetails, setPriceDetails] = useState("");
  const [priceIncludes, setPriceIncludes] = useState<string[]>([]);
  const [priceAdditionalCosts, setPriceAdditionalCosts] = useState<string[]>([]);
  const { status: saveStatus, markSaved, markError } = useSavedFeedback();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: business } = await supabase.from("businesses").select("id").eq("user_id", u.user.id).eq("business_type", "venue").maybeSingle();
      if (!business) {
        toast.error("Set up your venue profile first.");
        navigate({ to: "/business/onboarding/venue" as any, replace: true });
        return;
      }
      setBusinessId(business.id);
      const { data: details } = await supabase.from("venue_details").select("*").eq("business_id", business.id).maybeSingle();
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
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!businessId) return;
    setSaving(true);
    const cleanItems = (items: HeaderBodyItem[]) => items.filter((it) => it.header.trim() || it.body.trim());
    const { error } = await supabase.from("venue_details").upsert({
      business_id: businessId,
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
    setSaving(false);
    if (error) return markError(error.message);
    markSaved();
  };

  if (loading) return <AppShell title="Loading…"><div /></AppShell>;

  const detailsForm = (
    <div className="grid gap-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Capacity — min guests">
          <input type="number" value={capacityMin} onChange={(e) => setCapacityMin(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </Field>
        <Field label="Capacity — max guests">
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
        <div className="mt-2"><ChipToggleGroup options={TYPE_OF_SPACE_OPTIONS} selected={typeOfSpace} onChange={setTypeOfSpace} /></div>
      </Field>
      <Field label="Facilities included">
        <div className="mt-2"><TagListInput tags={facilitiesIncluded} onChange={setFacilitiesIncluded} placeholder="e.g. In-house catering" /></div>
      </Field>
      <Field label="Facilities excluded">
        <div className="mt-2"><TagListInput tags={facilitiesExcluded} onChange={setFacilitiesExcluded} placeholder="e.g. Alcohol license" /></div>
      </Field>
      <Field label="Price">
        <p className="text-sm text-muted-foreground -mt-0.5 mb-2">Used for marketplace filtering and the $ shown on cards.</p>
        <PriceTierPicker value={price} onChange={setPrice} />
      </Field>
      <div className="grid gap-4 rounded-2xl border border-line p-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground -mb-1">Pricing details (shown on your venue page)</p>
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
          Each one gets its own heading on your venue page — e.g. "Getting there" with directions. Leave empty and your plain description is shown instead.
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
      <div>
        <button onClick={save} disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium disabled:opacity-60 cursor-pointer transition-colors",
            saveStatus === "saved" ? "bg-sage-deep text-paper"
              : saveStatus === "error" ? "bg-cherry text-paper"
              : "bg-ink text-paper hover:bg-clay",
          )}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Couldn't save" : "Save changes"}
        </button>
      </div>
    </div>
  );

  return (
    <AppShell title="Venue details" subtitle="Capacity, type of space, facilities, and the enquiry form couples fill in.">
      <Tabs defaultValue="details" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="lead-form">Lead form</TabsTrigger>
        </TabsList>
        <TabsContent value="details">{detailsForm}</TabsContent>
        <TabsContent value="lead-form">
          {businessId && <VendorLeadFormBuilder businessId={businessId} vendorServiceId={null} categoryId={null} />}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
