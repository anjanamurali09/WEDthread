import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { getSessionUser } from "@/lib/session-user";
import { fetchCurrentWedding } from "@/lib/wedding-hooks";
import { cn } from "@/lib/utils";

// Where the venue and vendor pages focus ("Most popular venues in Dubai"). It starts from the couple's own
// wedding destination (when they are signed in and have listings there), can be changed with the pencil, and the
// last choice is remembered in the browser. "Anywhere" means no location.
export type Place = { kind: "city" | "country"; name: string } | null;

const KEY = "wedthread.market-place";

type Stored = { kind: "city" | "country"; name: string } | { kind: "any" };

function readStored(): Stored | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const v = JSON.parse(raw);
    if (v?.kind === "any") return v;
    if ((v?.kind === "city" || v?.kind === "country") && typeof v.name === "string") return v;
  } catch { /* storage unavailable */ }
  return undefined;
}

function findName(list: string[], wanted: string | null | undefined) {
  if (!wanted) return null;
  const w = wanted.trim().toLowerCase();
  return list.find((n) => n.toLowerCase() === w) ?? null;
}

export function useMarketPlace(cities: string[], countries: string[]) {
  const [stored, setStored] = useState<Stored | undefined>(undefined);
  const [weddingPlace, setWeddingPlace] = useState<{ city: string | null; country: string | null }>({ city: null, country: null });

  useEffect(() => {
    setStored(readStored());
    (async () => {
      try {
        if (!(await getSessionUser())) return;
        const w = await fetchCurrentWedding();
        if (w) setWeddingPlace({ city: w.destination_city ?? null, country: w.destination_country ?? null });
      } catch { /* no wedding, or signed out: just no starting point */ }
    })();
  }, []);

  const place: Place = useMemo(() => {
    if (stored && stored.kind !== "any") {
      const list = stored.kind === "city" ? cities : countries;
      const name = findName(list, stored.name);
      if (name) return { kind: stored.kind, name };
    }
    if (stored?.kind === "any") return null;
    const city = findName(cities, weddingPlace.city);
    if (city) return { kind: "city", name: city };
    const country = findName(countries, weddingPlace.country);
    if (country) return { kind: "country", name: country };
    return null;
  }, [stored, weddingPlace, cities, countries]);

  const setPlace = (p: Place) => {
    const next: Stored = p ?? { kind: "any" };
    setStored(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return { place, setPlace };
}

// Underlined place name with a pencil; opens a short list to pick another place or "Anywhere".
export function PlacePicker({ place, onChange, cities, countries, className }: {
  place: Place; onChange: (p: Place) => void; cities: string[]; countries: string[]; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const choose = (p: Place) => { onChange(p); setOpen(false); };
  const item = "block w-full px-4 py-2 text-left text-sm font-sans text-[#243746] hover:bg-[#FFF7D6]";

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      <button type="button" data-static onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        className="inline-flex items-center gap-2 underline decoration-2 underline-offset-[6px] hover:text-[#7FA8D6]">
        {place?.name ?? "anywhere"}
        <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-full z-30 mt-3 max-h-72 w-64 overflow-y-auto rounded-2xl border border-line bg-paper py-2 text-left shadow-lg">
          <button type="button" role="option" aria-selected={!place} data-static onClick={() => choose(null)} className={cn(item, !place && "font-medium")}>Anywhere</button>
          {cities.length > 0 && <p className="px-4 pb-1 pt-3 text-xs uppercase tracking-widest text-muted-foreground font-sans">Cities</p>}
          {cities.map((c) => (
            <button key={`c-${c}`} type="button" role="option" aria-selected={place?.kind === "city" && place.name === c} data-static
              onClick={() => choose({ kind: "city", name: c })} className={cn(item, place?.kind === "city" && place.name === c && "font-medium")}>{c}</button>
          ))}
          {countries.length > 0 && <p className="px-4 pb-1 pt-3 text-xs uppercase tracking-widest text-muted-foreground font-sans">Countries</p>}
          {countries.map((c) => (
            <button key={`k-${c}`} type="button" role="option" aria-selected={place?.kind === "country" && place.name === c} data-static
              onClick={() => choose({ kind: "country", name: c })} className={cn(item, place?.kind === "country" && place.name === c && "font-medium")}>{c}</button>
          ))}
        </div>
      )}
    </span>
  );
}

// True when a listing is in the chosen place (or there is no chosen place).
export function inPlace(place: Place, city: string | null, country: string | null) {
  if (!place) return true;
  return place.kind === "city" ? city === place.name : country === place.name;
}
