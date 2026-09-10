import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell, SIDEBAR_COLLAPSED_KEY } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Pencil } from "lucide-react";
import { TEMPLATES, getTemplate } from "@/lib/website-templates";
import { TemplatePreview } from "@/components/template-preview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/website")({ component: WebsitePage });

function WebsitePage() {
  const { data: wedding } = useCurrentWedding();
  const invalidate = useInvalidateWedding();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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
    if (error) return toast.error(error.message);
    invalidate(wedding.id);
    toast.success(wedding.site_published ? "Unpublished" : "Published");
  };

  const url = typeof window !== "undefined" ? `${window.location.origin}/w/${wedding.slug ?? ""}` : `/w/${wedding.slug ?? ""}`;
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const template = getTemplate(wedding.site_template_id);

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
    <AppShell title="Wedding website" subtitle="Customize every section: text, photos, and order — then publish.">
      <div className="paper-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${wedding.site_published ? "bg-cherry" : "bg-line"}`} />
            <div>
              <p className="text-sm">{wedding.site_published ? "Live" : "Draft, not yet published"}</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-wine inline-flex items-center gap-1">{url} <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/website/edit" className="inline-flex items-center gap-2 rounded-full border border-wine text-wine px-4 py-2 text-sm hover:bg-wine hover:text-pearl transition"><Pencil className="h-4 w-4" /> Open editor</Link>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
            </button>
            <button disabled={saving} onClick={togglePublish} className="rounded-full bg-ink text-pearl px-5 py-2 text-sm hover:bg-wine disabled:opacity-60">
              {wedding.site_published ? "Unpublish" : "Publish site"}
            </button>
          </div>
        </div>
      </div>

      <h2 className="font-serif text-2xl mt-10 mb-1">Templates</h2>
      <p className="text-sm text-muted-foreground mb-4">Pick a starting point — colors, fonts, and photos differ per template. Switching doesn't touch anything you've already written or uploaded.</p>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        {TEMPLATES.map((t) => {
          const active = t.id === template.id;
          return (
            <div key={t.id} className={cn("paper-card p-4", active && "ring-2 ring-wine")}>
              <button onClick={() => selectTemplate(t.id)} className="block w-full rounded-2xl overflow-hidden cursor-pointer">
                <TemplatePreview t={t} names={{ a: wedding.partner_a || "Aanya", b: wedding.partner_b || "Rahul" }} />
              </button>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-xl">{t.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                </div>
                {active ? (
                  <Link to="/website/edit" className="shrink-0 text-[10px] rounded-full bg-wine text-pearl px-3 py-1.5 whitespace-nowrap">Edit</Link>
                ) : (
                  <button onClick={() => selectTemplate(t.id)} className="shrink-0 text-[10px] rounded-full border border-wine text-wine px-3 py-1.5 whitespace-nowrap hover:bg-wine hover:text-pearl transition cursor-pointer">Use this</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
