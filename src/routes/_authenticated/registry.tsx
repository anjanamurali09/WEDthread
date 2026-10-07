import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding } from "@/lib/wedding-hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ExternalLink, Plus, Trash2, Globe2, Share2, Copy, Check, MessageCircle, X, Star, Eye, Loader2, ChevronDown, ImagePlus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/dropdown";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/currency";
import { RetailerFallback } from "@/components/retailer-fallback";
import { DEFAULT_REGISTRY_INTRO } from "@/lib/registry-intro";
import { useSavedFeedback } from "@/hooks/use-saved-feedback";

export const Route = createFileRoute("/_authenticated/registry")({ component: RegistryPage });

type ProductMetadata = { success: true; name: string | null; image: string | null; price: number | null } | { success: false };

async function fetchProductMetadata(url: string): Promise<ProductMetadata> {
  const { data, error } = await supabase.functions.invoke<ProductMetadata>("fetch-product-metadata", { body: { url } });
  if (error || !data) return { success: false };
  return data;
}

const BLANK_FORM = { title: "", product_url: "", price: "", retailer: "", image_url: "", description: "", is_most_wanted: false };

const COUNTRIES = [
  ["US", "United States"], ["UK", "United Kingdom"], ["IN", "India"],
  ["AE", "UAE"], ["AU", "Australia"], ["CA", "Canada"],
] as const;

// Currency dropdown order: local currency first, then by relevance to that country's
// couples, not alphabetical. Also doubles as the default currency (first entry) for
// registries created before the selector existed (registries.currency_code is null).
const CURRENCY_ORDER_BY_COUNTRY: Record<string, CurrencyCode[]> = {
  AE: ["AED", "INR", "GBP", "USD", "AUD", "CAD"],
  IN: ["INR", "AED", "GBP", "USD", "AUD", "CAD"],
  UK: ["GBP", "INR", "AED", "USD", "AUD", "CAD"],
  US: ["USD", "INR", "GBP", "AED", "AUD", "CAD"],
  AU: ["AUD", "INR", "GBP", "AED", "USD", "CAD"],
  CA: ["CAD", "INR", "GBP", "AED", "USD", "AUD"],
};

function withUtm(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "wedthread");
    u.searchParams.set("utm_medium", "referral");
    u.searchParams.set("utm_campaign", "registry");
    return u.toString();
  } catch { return rawUrl; }
}

// The couple's own wording for the line under their names on the guest-facing registry.
// A small popover beside the currency button, so it doesn't take up room on the page.
function GuestMessageButton({ wedding }: { wedding: any }) {
  const invalidate = useInvalidateWedding();
  const saved = ((wedding.site_customization as any)?.registryIntro as string | undefined) ?? DEFAULT_REGISTRY_INTRO;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(saved);
  const [saving, setSaving] = useState(false);
  const { status, markSaved, markError } = useSavedFeedback();
  useEffect(() => { setText(saved); }, [saved]);
  const save = async () => {
    setSaving(true);
    // Read the latest customization first so this never overwrites the website editor's settings.
    const { data: fresh } = await supabase.from("weddings").select("site_customization").eq("id", wedding.id).maybeSingle();
    const next = { ...((fresh?.site_customization as any) ?? {}), registryIntro: text.trim() || DEFAULT_REGISTRY_INTRO };
    const { error } = await supabase.from("weddings").update({ site_customization: next }).eq("id", wedding.id);
    setSaving(false);
    if (error) return markError(error.message);
    invalidate(wedding.id);
    markSaved();
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-paper px-4 py-2 text-xs hover:bg-stone transition-colors">
        <MessageCircle className="h-3 w-3" /> Guest message
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-pearl shadow-lg p-3">
            <p className="text-xs uppercase tracking-widest text-cherry">Message to your guests</p>
            <p className="mt-1 text-xs text-muted-foreground">Shown under your names at the top of the registry.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
              className="mt-2 w-full rounded-2xl border border-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cherry/40" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button onClick={save} disabled={saving || text === saved}
                className={cn("rounded-full px-4 py-1.5 text-xs transition-colors disabled:opacity-50",
                  status === "saved" ? "bg-sage-deep text-paper" : status === "error" ? "bg-danger text-paper" : "bg-ink text-paper hover:bg-[#4A7CAD]")}>
                {saving ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : "Save"}
              </button>
              {text !== DEFAULT_REGISTRY_INTRO && (
                <button onClick={() => setText(DEFAULT_REGISTRY_INTRO)} className="text-xs text-muted-foreground hover:text-ink">Original wording</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RegistryPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: registry, isLoading: registryLoading } = useQuery({
    queryKey: ["registry", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("registries").select("*").eq("wedding_id", wedding!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createRegistry = useMutation({
    mutationFn: async (country: string) => {
      const { data, error } = await supabase.from("registries").insert({ wedding_id: wedding!.id, country_code: country, is_public: true }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["registry", wedding?.id] }); toast.success("Registry created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["registry-items", registry?.id],
    enabled: !!registry?.id,
    queryFn: async () => (await supabase.from("registry_items").select("*").eq("registry_id", registry!.id).order("sort_order")).data ?? [],
  });

  // Pledges guests have recorded against the registry's funds (only the couple can read these).
  const fundIds = items.filter((i: any) => i.kind === "fund").map((i: any) => i.id);
  const { data: contribs = [] } = useQuery({
    queryKey: ["registry-contribs", registry?.id, fundIds.join(",")],
    enabled: fundIds.length > 0,
    queryFn: async () => ((await (supabase as any).from("registry_contributions").select("*").in("item_id", fundIds).order("created_at", { ascending: false })).data ?? []) as any[],
  });
  const resetPurchased = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registry_items").update({ purchased_by: null, purchased_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
  });

  const setCountry = useMutation({
    mutationFn: async (country: string) => {
      const { error } = await supabase.from("registries").update({ country_code: country }).eq("id", registry!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", wedding?.id] }),
  });

  const setCurrency = useMutation({
    mutationFn: async (currency: string) => {
      const { error } = await supabase.from("registries").update({ currency_code: currency }).eq("id", registry!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", wedding?.id] }),
  });

  const { data: affiliatePartners = [] } = useQuery({
    queryKey: ["affiliate-partners", registry?.country_code],
    enabled: !!registry?.country_code,
    queryFn: async () => (await supabase.from("affiliate_partners").select("*")
      .eq("status", "approved").eq("country", registry!.country_code!)).data ?? [],
  });

  const [form, setForm] = useState(BLANK_FORM);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Set when a fund (Honeymoon fund, …) is picked: no photo, store or link, and the price is a contribution.
  const [fund, setFund] = useState<string | null>(null);
  // The item being edited in the form on the right (null = adding a new one).
  const [editingId, setEditingId] = useState<string | null>(null);
  const startEdit = (it: any) => {
    setEditingId(it.id);
    setFund(it.kind === "fund" ? (["Honeymoon fund", "Home fund"].includes(it.title) ? it.title : "Custom") : null);
    setForm({
      title: it.title ?? "", product_url: it.product_url ?? "", price: it.price_cents ? String(it.price_cents / 100) : "",
      retailer: it.retailer ?? "", image_url: it.image_url ?? "", description: it.description ?? "", is_most_wanted: !!it.is_most_wanted,
    });
    document.getElementById("registry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const stopEdit = () => { setEditingId(null); setFund(null); setForm(BLANK_FORM); };

  const uploadPhoto = async (file: File) => {
    if (!wedding || !file.type.startsWith("image/")) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${wedding.id}/registry/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("wedding-assets").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, image_url: supabase.storage.from("wedding-assets").getPublicUrl(path).data.publicUrl }));
  };

  // Pasting a copied or screenshotted image anywhere on the page drops it into the photo box.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f && !(e.target instanceof HTMLInputElement && e.target.type === "text")) uploadPhoto(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const onUrlBlur = async () => {
    const raw = form.product_url.trim();
    const looksLikeUrl = /^https?:\/\//i.test(raw) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(raw);
    if (!raw || !looksLikeUrl) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setFetchingDetails(true);
    try {
      const result = await fetchProductMetadata(url);
      if (result.success) {
        setForm((f) => ({
          ...f,
          title: f.title || result.name || "",
          image_url: f.image_url || result.image || "",
          price: f.price || (result.price != null ? String(result.price) : ""),
        }));
      }
    } catch {
      // Best effort only: plenty of stores block it, and the couple fills the details in themselves.
    } finally {
      setFetchingDetails(false);
    }
  };

  const addItem = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const fields = {
        title: form.title.trim(),
        product_url: form.product_url ? withUtm(form.product_url) : null,
        retailer: form.retailer || null,
        image_url: form.image_url || null,
        kind: fund ? "fund" : "gift",
        description: fund ? (form.description.trim() || null) : null,
        price_cents: form.price ? Math.round(parseFloat(form.price) * 100) : null,
        is_most_wanted: form.is_most_wanted,
      };
      const { error } = editingId
        ? await supabase.from("registry_items").update(fields).eq("id", editingId)
        : await supabase.from("registry_items").insert({ registry_id: registry!.id, ...fields });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] });
      setForm(BLANK_FORM);
      setFund(null);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(/schema cache|kind/i.test(e.message ?? "")
      ? "Funds need one database update first. Run the registry funds migration in Supabase, then try again."
      : e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("registry_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
  });

  const toggleMostWanted = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase.from("registry_items").update({ is_most_wanted: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (weddingLoading || registryLoading) {
    return <AppShell title="Registry"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  if (!wedding) {
    return <AppShell title="Registry"><p className="text-sm text-muted-foreground">Finish onboarding first to create a registry.</p></AppShell>;
  }

  if (!registry) {
    return (
      <AppShell title="Registry" subtitle="Curate a gift list from retailers in your country. One link, shared with guests.">
        <div className="paper-card p-8 max-w-2xl">
          <h2 className="font-serif text-2xl">Where do most of your guests shop?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Pick your country to see suggested retailers. You can change this later.</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COUNTRIES.map(([code, name]) => (
              <button key={code} onClick={() => createRegistry.mutate(code)} disabled={createRegistry.isPending} className="rounded-2xl border border-line p-4 text-left hover:border-wine disabled:opacity-60">
                <p className="font-sans text-lg font-semibold">{name}</p>
                <p className="text-sm uppercase tracking-widest text-muted-foreground">{code}</p>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/w/${wedding.slug}/registry` : "";
  const countryOptions = COUNTRIES.map(([code, name]) => ({ value: code, label: name }));
  const currencyOrder = CURRENCY_ORDER_BY_COUNTRY[registry.country_code ?? "US"] ?? CURRENCY_ORDER_BY_COUNTRY.US;
  const currencyOptions = currencyOrder.map((code) => ({ value: code, label: `${code} (${CURRENCIES[code].label})` }));
  const currencyCode: CurrencyCode = (registry.currency_code as CurrencyCode) || currencyOrder[0];

  return (
    <AppShell title="Registry" subtitle="Add gifts and share one link with your guests."
      actions={
        <div className="flex items-center gap-2">
          <GuestMessageButton wedding={wedding} />
          <RegistryLocaleButton
            country={registry.country_code ?? "US"} currency={currencyCode}
            countryOptions={countryOptions} currencyOptions={currencyOptions}
            onCountryChange={(v) => setCountry.mutate(v)} onCurrencyChange={(v) => setCurrency.mutate(v)}
          />
        </div>
      }>
      {/* Share bar */}
      <div className="paper-card p-4 md:p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-widest text-cherry">Your registry link</p>
          <p className="mt-1 font-mono text-sm md:text-sm truncate">{shareUrl || `…/w/${wedding.slug}/registry`}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={`${shareUrl}?preview=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone transition-colors">
            <Eye className="h-4 w-4" /> Preview
          </a>
          <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-[#4A7CAD] transition-colors">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {affiliatePartners.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm uppercase tracking-widest text-muted-foreground shrink-0">Popular retailers</p>
                {affiliatePartners.map((p: any) => (
                  <a key={p.id} href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-wine">
                    <Globe2 className="h-3 w-3" /> {p.business_name} <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                ))}
              </div>
            ) : <div />}
          </div>

          {itemsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <section className="warm-wash rounded-[40px] border border-line/60 px-6 md:px-12 py-10 text-center max-w-2xl mx-auto">
              <p className="text-sm uppercase tracking-[0.3em] text-cherry">Your registry</p>
              <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight">A few things you've been dreaming of</h3>
              <p className="mt-3 text-sm text-ink leading-relaxed">Add a product link, name, and price on the right. Whatever you're hoping for.</p>
            </section>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((it: any) => (
                <div key={it.id} className="group relative flex flex-col">
                  {it.is_most_wanted && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[#FFE08A] text-ink px-2 py-0.5 text-[8px] font-medium uppercase tracking-wide">
                      <Star className="h-2.5 w-2.5 fill-current" /> Most wanted
                    </span>
                  )}
                  <div className="aspect-square overflow-hidden rounded-2xl bg-pearl">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <RetailerFallback productUrl={it.product_url} retailer={it.retailer}
                        iconClassName="h-10 w-10" textClassName="text-xs" />
                    )}
                  </div>
                  {/* The bordered card starts below the photo, with a clear gap, and is snug around its text. */}
                  <div className={cn("paper-card mt-4 flex flex-1 flex-col gap-1 px-3 py-3", it.is_most_wanted && "ring-2 ring-[#FFE08A]")}>
                    {it.kind === "fund"
                      ? <p className="text-xs uppercase tracking-widest text-muted-foreground">Fund</p>
                      : it.retailer && <p className="text-xs uppercase tracking-widest text-muted-foreground truncate">{it.retailer}</p>}
                    <p className="font-sans text-sm font-medium leading-snug line-clamp-2">{it.title}</p>
                    {it.kind === "fund" && it.description && <p className="text-xs text-muted-foreground line-clamp-2">{it.description}</p>}
                    {it.kind === "fund" && it.retailer && <p className="text-xs text-muted-foreground">Via {it.retailer}</p>}
                    {it.kind === "fund" && (() => {
                      const mine = contribs.filter((c: any) => c.item_id === it.id);
                      const total = mine.reduce((n: number, c: any) => n + c.amount_cents, 0);
                      return mine.length > 0
                        ? <p className="text-xs text-ink" title={mine.map((c: any) => `${c.guest_name}: ${formatMoney(c.amount_cents / 100, currencyCode)}`).join("\n")}>
                            {formatMoney(total / 100, currencyCode)} promised by {mine.length} guest{mine.length === 1 ? "" : "s"}
                          </p>
                        : <p className="text-xs text-muted-foreground">No contributions yet</p>;
                    })()}
                    {it.purchased_at && (
                      <p className="mt-0.5 flex items-center justify-between gap-2 rounded-lg bg-[#FFF2B2] px-2 py-1 text-xs text-ink">
                        <span className="truncate">Bought by {it.purchased_by}</span>
                        <button onClick={() => resetPurchased.mutate(it.id)} className="shrink-0 underline underline-offset-2">Undo</button>
                      </p>
                    )}
                    <span className="flex-1" />
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {it.price_cents ? (
                        <span className="text-sm font-medium text-ink">{formatMoney(it.price_cents / 100, currencyCode)}</span>
                      ) : <span />}
                      {it.product_url && (
                        <a href={it.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-ink underline-offset-2 hover:underline">
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button onClick={() => startEdit(it)} title="Edit" className="rounded-full bg-pearl/90 backdrop-blur p-1 text-muted-foreground hover:text-ink">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => toggleMostWanted.mutate({ id: it.id, next: !it.is_most_wanted })}
                      className={cn("rounded-full bg-pearl/90 backdrop-blur p-1", it.is_most_wanted ? "text-ink" : "text-muted-foreground hover:text-ink")}
                      title={it.is_most_wanted ? "Remove from most wanted" : "Mark as most wanted"}>
                      <Star className={cn("h-3 w-3", it.is_most_wanted && "fill-current")} />
                    </button>
                    <button onClick={() => removeItem.mutate(it.id)} className="rounded-full bg-pearl/90 backdrop-blur p-1 text-muted-foreground hover:text-cherry">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}


        </section>

        <aside id="registry-form" className="paper-card p-6 h-fit lg:sticky lg:top-6">
          <h3 className="font-sans text-xl font-semibold">{editingId ? (fund ? "Edit fund" : "Edit item") : fund ? "Add a fund" : "Add item"}</h3>

          <div className="mt-4 space-y-3">
            {/* A photo from the couple's own device (or dropped / pasted in) replaces scraping a web page. */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadPhoto(f); }}
              className="relative grid h-40 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-pearl text-center hover:bg-stone/60">
              {form.image_url ? (
                <>
                  <img src={form.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <button type="button" onClick={(e) => { e.preventDefault(); setForm({ ...form, image_url: "" }); }}
                    className="absolute right-2 top-2 rounded-full bg-paper/90 p-1 text-muted-foreground hover:text-ink" title="Remove photo"><X className="h-3.5 w-3.5" /></button>
                </>
              ) : (
                <span className="px-4 text-sm text-muted-foreground">
                  {uploading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <><ImagePlus className="mx-auto mb-1.5 h-5 w-5" />Upload, drop or paste a photo</>}
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
            </label>

            <input placeholder={fund ? "Name of the fund" : "Name of the gift"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />

            {fund && (
              <textarea rows={3} placeholder="Description" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full resize-none rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            )}

            {/* How guests should send it — shown to them right after they pledge. A fund has no store, so
                this uses the item's `retailer` field. */}
            {fund && (
              <input placeholder="Preferred way to receive (e.g. bank transfer, cash)" value={form.retailer}
                onChange={(e) => setForm({ ...form, retailer: e.target.value })}
                className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            )}

            <div className="grid grid-cols-2 gap-2">
              {!fund && <input placeholder="Store" value={form.retailer} onChange={(e) => setForm({ ...form, retailer: e.target.value })} className="rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm" />}
              <div className={cn("relative", fund && "col-span-2")}>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{CURRENCIES[currencyCode].symbol}</span>
                <input placeholder={fund ? "Amount (optional)" : "Price"} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ paddingLeft: 24 + CURRENCIES[currencyCode].symbol.length * 8 }} className="w-full rounded-2xl border border-line bg-pearl pr-3 py-2.5 text-sm" />
              </div>
            </div>

            {!fund && <div className="relative">
              <input placeholder="Link to the gift (optional)" value={form.product_url}
                onChange={(e) => setForm({ ...form, product_url: e.target.value })}
                onBlur={onUrlBlur}
                className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
              {fetchingDetails && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>}

            <button type="button" onClick={() => setForm({ ...form, is_most_wanted: !form.is_most_wanted })}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm transition-colors",
                form.is_most_wanted ? "bg-[#FFF2B2] text-ink border-[#FFE08A]" : "border-neutral-300 text-muted-foreground hover:bg-stone",
              )}>
              <Star className={cn("h-4 w-4", form.is_most_wanted && "fill-current")} />
              {form.is_most_wanted ? "Marked as most wanted" : "Mark as most wanted"}
            </button>

            <button onClick={() => addItem.mutate()} disabled={addItem.isPending || uploading} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper py-2.5 text-sm hover:bg-[#4A7CAD] disabled:opacity-60">
              {editingId ? <><Check className="h-4 w-4" /> Save changes</> : <><Plus className="h-4 w-4" /> Add to registry</>}
            </button>
            {editingId && (
              <button type="button" onClick={stopEdit} className="w-full rounded-full border border-neutral-300 py-2.5 text-sm text-muted-foreground hover:bg-stone">Cancel</button>
            )}

            {/* No link or photo needed for these — guests simply contribute. */}
            {!editingId && <div className="border-t border-neutral-200 pt-3">
              <p className="mb-1.5 text-xs uppercase tracking-widest text-muted-foreground">Or start from</p>
              <div className="flex flex-wrap gap-1.5">
                {["Honeymoon fund", "Home fund", "Custom"].map((t) => (
                  <button key={t} type="button"
                    onClick={() => {
                      if (fund === t) { setFund(null); setForm({ title: "", product_url: "", price: "", retailer: "", image_url: "", description: "", is_most_wanted: false }); return; }
                      setFund(t);
                      setForm({ ...form, title: t === "Custom" ? "" : t, product_url: "", retailer: "" });
                    }}
                    className={cn("rounded-full border px-3 py-1 text-sm", fund === t ? "border-ink bg-ink text-paper" : "border-neutral-300 hover:bg-stone")}>{t}{fund === t && <X className="ml-1.5 inline h-3 w-3" />}</button>
                ))}
              </div>
            </div>}
          </div>
        </aside>
      </div>

      {shareOpen && <ShareDialog url={shareUrl} wedding={wedding} onClose={() => setShareOpen(false)} />}
    </AppShell>
  );
}

// Country/currency used to be its own full-width card — most couples set it
// once and never touch it again, so it lives here instead as a compact
// top-right control, expanding into the two dropdowns only when opened.
function RegistryLocaleButton({ country, currency, countryOptions, currencyOptions, onCountryChange, onCurrencyChange }: {
  country: string; currency: string;
  countryOptions: { value: string; label: string }[]; currencyOptions: { value: string; label: string }[];
  onCountryChange: (v: string) => void; onCurrencyChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-paper px-4 py-2 text-xs hover:bg-stone transition-colors">
        {country} · {currency} <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-lg border border-line bg-pearl shadow-lg p-3 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-cherry">Country</p>
              <Dropdown size="sm" className="mt-1.5" value={country} onChange={onCountryChange} options={countryOptions} placeholder="Country" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-cherry">Currency</p>
              <Dropdown size="sm" className="mt-1.5" value={currency} onChange={onCurrencyChange} options={currencyOptions} placeholder="Currency" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ShareDialog({ url, wedding, onClose }: { url: string; wedding: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = `We've made a wedding registry! Take a look 💛\n${wedding.partner_a} & ${wedding.partner_b}\n${url}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;

  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="paper-card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-cherry"><X className="h-4 w-4" /></button>
        <p className="text-sm uppercase tracking-widest text-cherry">Share registry</p>
        <h3 className="mt-1 font-serif text-2xl">Send it to your guests</h3>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-line bg-pearl p-1 pl-4">
          <span className="flex-1 truncate font-mono text-sm">{url}</span>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-4 py-2 text-sm hover:bg-[#4A7CAD]">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>

        <a href={waHref} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white py-3 text-sm hover:opacity-90">
          <MessageCircle className="h-4 w-4" /> Share on WhatsApp
        </a>

        <div className="mt-5 pt-5 border-t border-line">
          <p className="text-sm uppercase tracking-widest text-muted-foreground text-center">Or scan the QR code</p>
          <div className="mt-3 grid place-items-center">
            <img src={qrSrc} alt="Registry QR code" width={200} height={200} className="rounded-2xl border border-line" />
          </div>
        </div>

        <p className="mt-5 text-sm text-muted-foreground text-center">Your registry is public: anyone with this link can view it. It also appears on your wedding site.</p>
      </div>
    </div>
  );
}
