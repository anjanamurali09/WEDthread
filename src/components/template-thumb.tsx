import type { Template } from "@/lib/website-templates";
import { TemplateSitePreview } from "@/components/template-site-preview";

// The gallery thumbnail is the top of the template's real page, scaled down — the same components
// the editor and the published site render — so a card always matches its preview exactly.
export function TemplateThumb({ t, wedding, current }: { t: Template; wedding: any; current: boolean }) {
  return <TemplateSitePreview t={t} wedding={wedding} current={current} device="desktop" thumb />;
}
