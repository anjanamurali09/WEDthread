import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, SIDEBAR_COLLAPSED_KEY } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Copy, Check, ExternalLink, Pencil, Monitor, Smartphone, Heart } from "lucide-react";
import { TEMPLATES, getTemplate } from "@/lib/website-templates";
import { TemplateThumb } from "@/components/template-thumb";
import { TemplateSitePreview } from "@/components/template-site-preview";
import { cn } from "@/lib/utils";
import { useSavedFeedback } from "@/hooks/use-saved-feedback";

export const Route = createFileRoute("/_authenticated/website")({ component: WebsitePage });

function WebsitePage() {
  const { data: wedding } = useCurrentWedding();
  const invalidate = useInvalidateWedding();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  // Choosing the web address (slug) of the site: editable by the wedding's owner.
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const { status: publishStatus, markSaved: markPublishOk, markError: markPublishError } = useSavedFeedback();
  // The design highlighted on the left and shown on the right (not yet applied).
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [onlyFavourites, setOnlyFavourites] = useState(false);

  // The website section's own workspace needs the horizontal room, so collapse the main
  // app sidebar via its existing toggle the moment either website page mounts (see the
  // matching comment in website_.edit.tsx for why this runs during render, not an effect).
  const collapsedSidebarOnce = useRef(false);
  if (!collapsedSidebarOnce.current) {
    collapsedSidebarOnce.current = true;
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1"); } catch {}
  }

  if (!wedding) return null;

  const togglePublish = async () => {
    setSaving(true);
    const { error } = await supabase.from("weddings").update({ site_published: !wedding.site_published }).eq("id", wedding.id);
    setSaving(false);
    if (error) return markPublishError(error.message);
    invalidate(wedding.id);
    markPublishOk();
  };

  const url = typeof window !== "undefined" ? `${window.location.origin}/w/${wedding.slug ?? ""}` : `/w/${wedding.slug ?? ""}`;
  const cleanSlug = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-");
  const startEditSlug = () => { setSlugDraft(wedding.slug ?? ""); setSlugError(null); setEditingSlug(true); };
  const saveSlug = async () => {
    const next = cleanSlug(slugDraft).replace(/^-|-$/g, "");
    if (next.length < 3) return setSlugError("Use at least 3 letters or numbers.");
    if (next.length > 40) return setSlugError("Keep it to 40 characters or fewer.");
    if (next === wedding.slug) { setEditingSlug(false); return; }
    setSlugSaving(true); setSlugError(null);
    const { error } = await supabase.from("weddings").update({ slug: next }).eq("id", wedding.id);
    setSlugSaving(false);
    if (error) return setSlugError(error.code === "23505" ? "That link is already taken. Try another." : error.message);
    invalidate(wedding.id);
    setEditingSlug(false);
  };
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const template = getTemplate(wedding.site_template_id);
  const shown = getTemplate(previewId ?? wedding.site_template_id);
  // Saved on the wedding itself (site_customization.favoriteTemplates), so there's nothing extra to migrate.
  const favourites: string[] = ((wedding.site_customization as any)?.favoriteTemplates as string[] | undefined) ?? [];
  const toggleFavourite = async (id: string) => {
    const next = favourites.includes(id) ? favourites.filter((f) => f !== id) : [...favourites, id];
    const { error } = await supabase.from("weddings").update({ site_customization: { ...((wedding.site_customization as any) ?? {}), favoriteTemplates: next } }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    invalidate(wedding.id);
  };

  // Only changes the palette/font/photo defaults a NEW wedding would seed — an existing
  // wedding's sections (and any content already typed into them) are untouched, since
  // website_.edit.tsx only ever seeds sections once, the first time a wedding has none.
  const selectTemplate = async (id: string) => {
    if (id === template.id) return;
    const { error } = await supabase.from("weddings").update({ site_template_id: id }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    invalidate(wedding.id);
  };

  return (
    <AppShell title="Wedding website" subtitle="Customize every section: text, photos, and order. Then publish.">
      <div className="paper-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${wedding.site_published ? "bg-emerald-500" : "bg-line"}`} />
            <div>
              <p className="text-sm">{wedding.site_published ? "Live" : "Draft, not yet published"}</p>
              {editingSlug ? (
                <div className="mt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{typeof window !== "undefined" ? `${window.location.host}/w/` : "/w/"}</span>
                    <input autoFocus value={slugDraft} onChange={(e) => { setSlugDraft(cleanSlug(e.target.value)); setSlugError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") saveSlug(); if (e.key === "Escape") setEditingSlug(false); }}
                      className="w-56 rounded-full border border-line bg-paper px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
                    <button onClick={saveSlug} disabled={slugSaving} className="rounded-full bg-ink px-4 py-1.5 text-sm text-pearl hover:bg-wine disabled:opacity-60">{slugSaving ? "Saving…" : "Save"}</button>
                    <button onClick={() => setEditingSlug(false)} className="text-sm text-muted-foreground hover:text-ink">Cancel</button>
                  </div>
                  {slugError
                    ? <p className="mt-1.5 text-sm text-destructive">{slugError}</p>
                    : <p className="mt-1.5 text-xs text-muted-foreground">Letters, numbers and hyphens. Anyone with your old link will need the new one.</p>}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-wine inline-flex items-center gap-1">{url} <ExternalLink className="h-3 w-3" /></a>
                  {userId && wedding.owner_id === userId && (
                    <button onClick={startEditSlug} className="text-sm text-cherry underline underline-offset-4 hover:text-ink">Change link</button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/website/edit" className="inline-flex items-center gap-2 rounded-full border border-wine text-wine px-4 py-2 text-sm hover:bg-wine hover:text-pearl transition"><Pencil className="h-4 w-4" /> Open editor</Link>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
            </button>
            {wedding.site_published ? (
              // Live: shown as a status; clicking it takes the site back offline.
              <button disabled={saving} onClick={togglePublish} title="Your site is live. Click to take it offline."
                className="inline-flex items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-50 text-emerald-800 px-5 py-2 text-sm hover:bg-emerald-100 disabled:opacity-60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {publishStatus === "error" ? "Couldn't update. Try again" : "Live site"}
              </button>
            ) : (
              <button disabled={saving} onClick={togglePublish} className="rounded-full bg-ink text-pearl px-5 py-2 text-sm hover:bg-wine disabled:opacity-60">
                {publishStatus === "error" ? "Couldn't publish. Try again" : "Publish site"}
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-serif text-2xl mt-10 mb-1">Templates</h2>
      <p className="text-sm text-muted-foreground mb-4">Click a design to preview it on the right. Switching doesn't touch anything you've already written or uploaded.</p>
      <div className="mb-4 inline-flex rounded-full border border-line p-0.5">
          {([["All", false], [`Favourites${favourites.length ? ` (${favourites.length})` : ""}`, true]] as const).map(([label, fav]) => (
            <button key={label} onClick={() => setOnlyFavourites(fav)}
              className={cn("rounded-full px-4 py-1 text-sm cursor-pointer", onlyFavourites === fav ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>{label}</button>
          ))}
        </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div>
        {onlyFavourites && favourites.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted-foreground">Tap the heart on a design to save it here.</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.filter((t) => !onlyFavourites || favourites.includes(t.id)).map((t) => {
            const isCurrent = t.id === template.id;
            const isPreviewing = t.id === shown.id;
            return (
              <div key={t.id} role="button" tabIndex={0} onClick={() => setPreviewId(t.id)} onKeyDown={(e) => e.key === "Enter" && setPreviewId(t.id)} title={t.desc}
                className={cn("paper-card p-2 text-left cursor-pointer transition", isPreviewing && "ring-2 ring-ink")}>
                <div className="overflow-hidden rounded-lg">
                  <TemplateThumb t={t} wedding={wedding} current={isCurrent} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                  <p className="min-w-0 truncate text-sm font-medium">{t.name}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isCurrent && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] text-paper">Current</span>}
                    <button type="button" aria-label={favourites.includes(t.id) ? "Remove from favourites" : "Add to favourites"}
                      onClick={(e) => { e.stopPropagation(); toggleFavourite(t.id); }} className="cursor-pointer p-0.5">
                      <Heart className={cn("h-4 w-4 transition", favourites.includes(t.id) ? "fill-[#E63950] text-[#E63950]" : "text-muted-foreground hover:text-ink")} />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex gap-1.5 px-0.5">
                  {[t.palette.bg, t.palette.soft, t.palette.accent, t.palette.ink].map((c) => (
                    <span key={c} className="h-3.5 w-3.5 rounded-full border border-neutral-300" style={{ background: c }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Right: a live preview of whichever design is highlighted, before choosing it. */}
        <div className="paper-card overflow-hidden lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-300 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {[shown.palette.bg, shown.palette.soft, shown.palette.accent, shown.palette.ink].map((c) => (
                <span key={c} className="h-4 w-4 shrink-0 rounded-full border border-neutral-300" style={{ background: c }} />
              ))}
              <span className="ml-1 truncate font-serif text-lg">{shown.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex rounded-full border border-neutral-300 p-0.5">
                <button onClick={() => setDevice("desktop")} title="Desktop" className={cn("rounded-full p-1.5 cursor-pointer", device === "desktop" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}><Monitor className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDevice("mobile")} title="Phone" className={cn("rounded-full p-1.5 cursor-pointer", device === "mobile" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}><Smartphone className="h-3.5 w-3.5" /></button>
              </div>
              {shown.id === template.id ? (
                <Link to="/website/edit" className="rounded-full bg-ink px-4 py-1.5 text-sm text-paper hover:bg-clay">Continue editing</Link>
              ) : (
                <button onClick={() => selectTemplate(shown.id)} className="rounded-full bg-ink px-4 py-1.5 text-sm text-paper hover:bg-clay cursor-pointer">Select this design →</button>
              )}
            </div>
          </div>
          <div className="h-[70vh] bg-stone/30">
            <TemplateSitePreview key={shown.id} t={shown} wedding={wedding} current={shown.id === template.id} device={device} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
