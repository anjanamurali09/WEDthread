import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Copy, Check, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { Wedding, Guest } from "@/lib/wedding-hooks";

// Shared by the RSVP Questions page ("Share RSVP" button) and the Messages page (the
// RSVP request template card) — same modal, same links, regardless of which page opened
// it, so the two entry points can't drift into showing different data.
export function ShareRsvpDialog({ wedding, guests, onClose }: {
  wedding: Pick<Wedding, "slug" | "partner_a" | "partner_b">;
  guests: Pick<Guest, "id" | "full_name" | "rsvp_token">[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // Tracks which single link (by key — "general" or a guest id) is showing its brief
  // "Copied!" state right now, on top of the toast every copy action in this app already
  // shows (matches the existing per-guest "copy RSVP link" button on the Guests page).
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const generalLink = wedding.slug ? `${origin}/rsvp/w/${wedding.slug}` : "";

  const copyLink = async (url: string, key: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("RSVP link copied");
    if (resetRef.current) clearTimeout(resetRef.current);
    setCopiedKey(key);
    resetRef.current = setTimeout(() => setCopiedKey(null), 1500);
  };

  // Only the single best match shows, not the whole guest list — this is a quick lookup
  // ("I need Akila's link") not a browse-everyone view; the full list already lives on
  // the Guests page.
  const match = query.trim()
    ? guests.find((g) => g.full_name.toLowerCase().includes(query.trim().toLowerCase()))
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-end">
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="-mt-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">General link</p>
          {wedding.slug ? (
            <div className="flex items-center gap-2">
              <input readOnly value={generalLink}
                className="flex-1 rounded-2xl border border-line bg-stone/40 px-4 py-2.5 text-sm text-ink truncate focus:outline-none" />
              <button onClick={() => copyLink(generalLink, "general")}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-4 py-2.5 text-sm hover:bg-clay cursor-pointer shrink-0">
                {copiedKey === "general" ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Add a wedding slug in Settings to enable the general link.</p>
          )}
        </div>

        <div className="mt-6">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Personalized links</p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guests"
              className="w-full rounded-full border border-line bg-paper pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
          {query.trim() && (
            <div className="mt-2">
              {match ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line/60 px-3 py-2">
                  <span className="text-sm truncate">{match.full_name}</span>
                  <button onClick={() => copyLink(`${origin}/rsvp/${match.rsvp_token}`, match.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-stone cursor-pointer shrink-0">
                    {copiedKey === match.id ? <><Check className="h-3.5 w-3.5 text-sage-deep" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic py-2 text-center">No guest matches.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Head to Messages to send this to your guests</p>
          <Link to="/messages" search={{ remind: undefined }} title="Go to Messages"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-paper hover:bg-clay cursor-pointer">
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
