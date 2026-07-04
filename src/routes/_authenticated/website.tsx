import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Copy, Check, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/website")({ component: WebsitePage });

const TEMPLATES = [
  { id: "editorial-serif", name: "Editorial Serif", desc: "Big headline, tall hero image, generous margins.", palette: ["#FDFCFB", "#2A2A2A", "#A34E36"] },
  { id: "modern-minimal", name: "Modern Minimal", desc: "Sans-serif, quiet, black-on-white.", palette: ["#FFFFFF", "#111111", "#D4D4D4"] },
  { id: "coastal-warm", name: "Coastal Warm", desc: "Sandy beige, ocean blue, breezy layout.", palette: ["#F5EDE0", "#22546B", "#E9B27C"] },
  { id: "mehendi-mosaic", name: "Mehendi Mosaic", desc: "Deep green with gold accents; small pattern motifs.", palette: ["#0F3D2E", "#D9B67B", "#FFF6E5"] },
  { id: "romantic-blush", name: "Romantic Blush", desc: "Pale pink, script accent, floral edges.", palette: ["#FBEEEA", "#8B4B4B", "#E9C7BA"] },
  { id: "night-garden", name: "Night Garden", desc: "Dark charcoal, botanical illustrations, gold text.", palette: ["#171817", "#E4C079", "#3B4B3F"] },
  { id: "kraft-journal", name: "Kraft Journal", desc: "Paper texture, hand-drawn dividers, warm brown.", palette: ["#EFE5D2", "#4A3520", "#B4854B"] },
  { id: "arabesque-lux", name: "Arabesque Lux", desc: "Cream with maroon geometric motifs.", palette: ["#F4EBDD", "#5B1A24", "#C79A5B"] },
  { id: "citrus-bloom", name: "Citrus Bloom", desc: "Playful, mustard, coral, and off-white.", palette: ["#FEF8EC", "#E86A33", "#F2C14E"] },
  { id: "sanskrit-modern", name: "Sanskrit Modern", desc: "Devanagari-friendly typography, saffron accents.", palette: ["#FFF7EC", "#231F20", "#E76F00"] },
];

function WebsitePage() {
  const { data: wedding } = useCurrentWedding();
  const invalidate = useInvalidateWedding();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!wedding) return null;

  const setTemplate = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("weddings").update({ site_template_id: id }).eq("id", wedding.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidate(wedding.id);
    toast.success("Template selected");
  };

  const togglePublish = async () => {
    setSaving(true);
    const { error } = await supabase.from("weddings").update({ site_published: !wedding.site_published }).eq("id", wedding.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidate(wedding.id);
    toast.success(wedding.site_published ? "Unpublished" : "Published");
  };

  const url = `${window.location.origin}/w/${wedding.slug ?? ""}`;
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <AppShell title="Wedding website" subtitle="Pick a template. Publish. Share the link. Guests can RSVP right from the site.">
      <div className="paper-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${wedding.site_published ? "bg-clay" : "bg-line"}`} />
            <div>
              <p className="text-sm">{wedding.site_published ? "Live" : "Draft, not yet published"}</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-clay inline-flex items-center gap-1">{url} <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
            </button>
            <button disabled={saving} onClick={togglePublish} className="rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay disabled:opacity-60">
              {wedding.site_published ? "Unpublish" : "Publish site"}
            </button>
          </div>
        </div>
      </div>

      <h2 className="font-serif text-2xl mt-10 mb-4">Templates</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => {
          const active = wedding.site_template_id === t.id;
          return (
            <button key={t.id} onClick={() => setTemplate(t.id)} className={`text-left paper-card p-5 transition-shadow hover:shadow-md ${active ? "ring-2 ring-clay" : ""}`}>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden flex" style={{ background: t.palette[0] }}>
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <p className="font-serif text-2xl" style={{ color: t.palette[1] }}>Aria & Rohan</p>
                    <p className="text-[10px] tracking-widest uppercase mt-1" style={{ color: t.palette[2] }}>- together -</p>
                  </div>
                </div>
                <div className="w-2" style={{ background: t.palette[2] }} />
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </div>
                {active && <span className="text-[10px] rounded-full bg-clay text-paper px-2 py-1">Selected</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-10 paper-card p-6">
        <p className="text-[10px] uppercase tracking-widest text-clay">Coming soon</p>
        <h3 className="font-serif text-xl mt-1">Custom subdomain, <span className="text-muted-foreground">yourname.vowzy.app</span></h3>
        <p className="mt-2 text-sm text-muted-foreground">For launch, sites live at /w/{wedding.slug}. Subdomain routing is queued for the next release.</p>
      </div>
    </AppShell>
  );
}
