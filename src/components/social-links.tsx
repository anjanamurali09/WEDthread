import { Instagram, Facebook, Youtube, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type SocialLinkValues = {
  instagram_url: string;
  tiktok_url: string;
  facebook_url: string;
  youtube_url: string;
  website_url: string;
};

export const EMPTY_SOCIAL_LINKS: SocialLinkValues = {
  instagram_url: "", tiktok_url: "", facebook_url: "", youtube_url: "", website_url: "",
};

// lucide-react has no TikTok glyph — hand-authored to match the stroke-icon
// sizing/style of its neighbors here (24x24 viewBox, currentColor).
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M15 3a5 5 0 0 0 5 5" />
    </svg>
  );
}

const PLATFORMS: { key: keyof SocialLinkValues; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }[] = [
  { key: "instagram_url", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/…" },
  { key: "tiktok_url", label: "TikTok", icon: TikTokIcon, placeholder: "https://tiktok.com/@…" },
  { key: "facebook_url", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/…" },
  { key: "youtube_url", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@…" },
  { key: "website_url", label: "Website", icon: Globe, placeholder: "https://yourwebsite.com" },
];

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// One input per platform (rather than the old single free-text "social media"
// field) so each link can be validated/displayed independently and rendered
// as its own icon on the public listing.
export function SocialLinksFields({ values, onChange }: { values: SocialLinkValues; onChange: (key: keyof SocialLinkValues, value: string) => void }) {
  return (
    <div className="grid gap-3">
      <span className="text-sm uppercase tracking-widest text-muted-foreground">Social links</span>
      {PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
        <div key={key} className="relative">
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={values[key]} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} aria-label={label}
            className="w-full rounded-2xl border border-line bg-pearl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
      ))}
    </div>
  );
}

// Public-facing display — only platforms with a link actually entered get an
// icon; each links out to exactly what was entered (protocol added if
// missing), nothing auto-guessed from a handle or business name.
export function SocialIconLinks({ links, className }: { links: Partial<SocialLinkValues>; className?: string }) {
  const present = PLATFORMS.filter(({ key }) => links[key]?.trim());
  if (present.length === 0) return null;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {present.map(({ key, icon: Icon, label }) => (
        <a key={key} href={normalizeUrl(links[key]!)} target="_blank" rel="noopener noreferrer" aria-label={label}
          className="text-muted-foreground hover:text-cherry transition-colors">
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}
