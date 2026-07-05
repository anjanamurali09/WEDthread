import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useInvalidateWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Pencil } from "lucide-react";
import { TEMPLATES, getTemplate } from "@/lib/website-templates";

export const Route = createFileRoute("/_authenticated/website")({ component: WebsitePage });

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
    toast.success("Template selected — open the editor to customize");
  };

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
  const activeId = wedding.site_template_id ?? "pearl-wine";

  return (
    <AppShell title="Wedding website" subtitle="Pick a template, then click Edit to customize every section — text, photos, order.">
      <div className="paper-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${wedding.site_published ? "bg-cherry" : "bg-line"}`} />
            <div>
              <p className="text-sm">{wedding.site_published ? "Live" : "Draft, not yet published"}</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-wine inline-flex items-center gap-1">{url} <ExternalLink className="h-3 w-3" /></a>
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

      <h2 className="font-serif text-2xl mt-10 mb-4">Templates <span className="text-sm text-muted-foreground font-sans">· {TEMPLATES.length} to choose from</span></h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => {
          const active = activeId === t.id;
          return (
            <div key={t.id} className={`paper-card p-5 transition-shadow hover:shadow-md ${active ? "ring-2 ring-wine" : ""}`}>
              <button onClick={() => setTemplate(t.id)} className="w-full text-left">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden flex flex-col justify-center items-center p-6" style={{ background: t.palette.bg }}>
                  <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: t.palette.accent }}>together</p>
                  <p className="mt-2 text-center" style={{ fontFamily: `"${t.fonts.display}", serif`, color: t.palette.ink, fontSize: 26, lineHeight: 1.1 }}>
                    {wedding.partner_a || "Partner A"}
                    <br /><span style={{ color: t.palette.accent }}>&</span><br />
                    {wedding.partner_b || "Partner B"}
                  </p>
                  <div className="mt-3 flex gap-1">
                    {[t.palette.ink, t.palette.accent, t.palette.soft].map((c) => (
                      <span key={c} className="h-2 w-6 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </button>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-xl">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </div>
                {active ? (
                  <Link to="/website/edit" className="shrink-0 text-[10px] rounded-full bg-wine text-pearl px-3 py-1.5 whitespace-nowrap">Selected · Edit</Link>
                ) : (
                  <button onClick={() => setTemplate(t.id)} className="shrink-0 text-[10px] rounded-full border border-line px-3 py-1.5 whitespace-nowrap hover:border-wine">Use</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
