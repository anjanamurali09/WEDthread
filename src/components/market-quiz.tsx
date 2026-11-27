import { useEffect, useState } from "react";
import { Armchair, Sunset, TreePine, Waves } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PRICE_TIERS } from "@/lib/price-tiers";
import { formatMoney } from "@/lib/currency";
import { VENDOR_GROUPS } from "@/lib/vendor-groups";
import type { Place } from "@/lib/market-place";
import { FIRST_DATES, SIGNS, STANCES, estimateBudget, groupLabel, type QuizVenue, type Stance } from "@/lib/market-quiz-logic";
import { cn } from "@/lib/utils";

// The quiz on the venue and vendor pages. It never asks for a number people do not know (a budget, a "type of
// space"). It asks about a first date each partner loved, or what they would never compromise on, and works out
// the filters from that. Either partner can answer for both.
export type VenueAnswers = { guests: number | null; p1: string[]; p2: string[]; signs: (string | null)[]; tiers: string[] };
export type VendorAnswers = { p1: string[]; p2: string[]; stance: Record<string, Stance> };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} data-static
      className={cn("rounded-full border px-4 py-2 text-sm transition-colors",
        on ? "border-[#243746] bg-[#FFF7D6] font-medium" : "border-line bg-white hover:border-[#243746]")}>
      {children}
    </button>
  );
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Shell({ open, onOpenChange, photo, steps, step, title, hint, error, onBack, onNext, nextLabel, children }: {
  open: boolean; onOpenChange: (v: boolean) => void; photo?: string; steps: string[]; step: number;
  title: string; hint: string; error: string | null; onBack: () => void; onNext: () => void; nextLabel: string; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-3xl border-line bg-pearl p-0 sm:rounded-3xl">
        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden bg-[#FFF7D6] md:block">
            {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          </div>
          <div className="flex min-h-[480px] flex-col p-8">
            <div className="flex items-start justify-between gap-4 pr-8">
              <ol className="flex flex-1 items-center gap-3 text-sm" aria-label="Progress">
                {steps.map((label, i) => (
                  <li key={label} aria-current={i === step ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs",
                      i === step ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-line text-muted-foreground")}>{i + 1}</span>
                    {i === step && <span className="whitespace-nowrap font-medium">{label}</span>}
                    {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
                  </li>
                ))}
              </ol>
            </div>
            <DialogTitle className="mt-10 font-serif text-3xl leading-tight text-[#243746]">{title}</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">{hint}</DialogDescription>
            <div className="mb-5 mt-6 flex-1">{children}</div>
            {error && <p className="mb-3 text-sm text-cherry">{error}</p>}
            <div className="flex items-center gap-3">
              {step > 0 && <button type="button" onClick={onBack} data-static className="rounded-full border border-[#243746] px-6 py-2.5 text-sm font-medium text-[#243746] hover:bg-[#FFF7D6]">Back</button>}
              <button type="button" onClick={onNext} data-static className="flex-1 rounded-full bg-[#FFE08A] px-6 py-2.5 text-sm font-medium text-[#243746] transition-colors hover:bg-[#F2C94C]">{nextLabel}</button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


const GUEST_FEELS = [
  { label: "An intimate dinner", guests: 40 },
  { label: "A proper party", guests: 100 },
  { label: "The whole family and then some", guests: 200 },
];

// One picture card, for the first-date question. Uses a photo of a real venue of that kind when there is one.
const DATE_ICONS: Record<string, typeof Armchair> = { dinner: Armchair, picnic: TreePine, pool: Waves, sunset: Sunset };

function DateCard({ id, label, note, photo, on, onClick }: { id: string; label: string; note: string; photo?: string; on: boolean; onClick: () => void }) {
  const Icon = DATE_ICONS[id] ?? Sunset;
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} data-static
      className={cn("group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border-2 p-3 text-left transition-colors",
        on ? "border-[#243746]" : "border-transparent hover:border-[#243746]/40", photo ? "bg-[#243746]" : "bg-[#FFF7D6]")}>
      {photo && <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
      {photo && <span className="absolute inset-0 bg-gradient-to-t from-[#243746]/80 via-[#243746]/10 to-transparent" />}
      {!photo && <Icon className="absolute left-3 top-3 h-7 w-7 text-[#243746]/70" strokeWidth={1.4} aria-hidden="true" />}
      <span className={cn("relative font-serif text-lg leading-tight", photo ? "text-white" : "text-[#243746]")}>{label}</span>
      <span className={cn("relative text-xs leading-snug", photo ? "text-white/85" : "text-[#243746]/80")}>{note}</span>
      {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#FFE08A] text-xs font-semibold text-[#243746]">&#10003;</span>}
    </button>
  );
}

function SignSelect({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className="block text-sm font-medium text-[#243746]">{label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}
        className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#FFE08A]">
        <option value="">Skip</option>
        {SIGNS.map((x) => <option key={x.name} value={x.name}>{x.name} ({x.dates})</option>)}
      </select>
    </label>
  );
}

export function VenueQuiz({ open, onOpenChange, photo, initialGuests, venues, place, spacePhotos, onApply }: {
  open: boolean; onOpenChange: (v: boolean) => void; photo?: string; initialGuests?: number | null;
  venues: QuizVenue[]; place: Place; spacePhotos: Record<string, string>; onApply: (a: VenueAnswers) => void;
}) {
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [p1, setP1] = useState<string[]>([]);
  const [p2, setP2] = useState<string[]>([]);
  const [signs, setSigns] = useState<(string | null)[]>([null, null]);
  const [stretch, setStretch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setStep(0); setError(null); if (initialGuests && !guests) setGuests(String(initialGuests)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const guestCount = deciding || !(Number(guests) > 0) ? null : Math.round(Number(guests));
  const estimate = estimateBudget(venues, place, guestCount);
  const placeName = place?.name ?? "all locations";

  const next = () => {
    if (step === 0 && !deciding && !(Number(guests) > 0)) { setError("Enter a guest count, pick a feel, or tick that you're still deciding."); return; }
    if (step === 1 && p1.length === 0) { setError("Pick the date that sounds most like you."); return; }
    if (step === 2 && p2.length === 0) { setError("Pick one, or tap \"Same as Partner 1\"."); return; }
    setError(null);
    if (step < 4) { setStep(step + 1); return; }
    onApply({ guests: guestCount, p1, p2, signs, tiers: estimate ? (stretch ? estimate.stretchTiers : estimate.tiers).map(String) : [] });
    onOpenChange(false);
  };

  const titles = [
    "How many people are you picturing?",
    "Partner 1: pick your perfect first date",
    "Partner 2: now yours",
    "Just for fun: what are your signs?",
    "Here's what venues like yours cost",
  ];
  const hints = [
    "A best guess is fine, or pick the feel that sounds right.",
    "Choose one or two. Either of you can answer for both.",
    "Or tap \"Same as Partner 1\" if you're agreed.",
    "This only nudges the order of your matches. Skip it if you like.",
    guestCount ? `Worked out from ${guestCount} guests in ${placeName}.` : `Worked out from venues in ${placeName}.`,
  ];

  const range = (low: number, high: number, currency: string | null) =>
    currency ? `${formatMoney(Math.round(low / 100) * 100, currency)} to ${formatMoney(Math.round(high / 100) * 100, currency)}` : null;
  const symbols = (t: number[]) => t.length === 1 ? PRICE_TIERS[t[0]].symbol : `${PRICE_TIERS[t[0]].symbol} – ${PRICE_TIERS[t[t.length - 1]].symbol}`;

  const dates = (value: string[], set: (v: string[]) => void) => (
    <div className="grid grid-cols-2 gap-3">
      {FIRST_DATES.map((d) => (
        <DateCard key={d.key} id={d.key} label={d.label} note={d.note} photo={spacePhotos[d.spaces[0]]} on={value.includes(d.key)}
          onClick={() => { set(toggle(value, d.key)); setError(null); }} />
      ))}
    </div>
  );

  return (
    <Shell open={open} onOpenChange={onOpenChange} photo={photo} steps={["Your day", "Partner 1", "Partner 2", "The stars", "Your range"]} step={step} error={error}
      title={titles[step]} hint={hints[step]}
      onBack={() => { setStep(step - 1); setError(null); }} onNext={next} nextLabel={step === 4 ? "See my matches" : step === 3 && !signs.some(Boolean) ? "Skip" : "Next"}>
      {step === 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {GUEST_FEELS.map((f) => (
              <Chip key={f.label} on={!deciding && Number(guests) === f.guests} onClick={() => { setGuests(String(f.guests)); setDeciding(false); setError(null); }}>{f.label}</Chip>
            ))}
          </div>
          <label className="block text-sm font-medium text-[#243746]">Or enter a number
            <input type="number" min={1} inputMode="numeric" value={guests} disabled={deciding}
              onChange={(e) => { setGuests(e.target.value); setError(null); }}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#FFE08A] disabled:opacity-50" />
          </label>
          <label className="flex items-center gap-3 text-sm text-[#243746]">
            <input type="checkbox" checked={deciding} onChange={(e) => { setDeciding(e.target.checked); setError(null); }} className="h-4 w-4 accent-[#243746]" />
            We're still deciding
          </label>
        </div>
      )}
      {step === 1 && dates(p1, setP1)}
      {step === 2 && (
        <div className="space-y-3">
          {dates(p2, setP2)}
          <button type="button" data-static onClick={() => { setP2(p1); setError(null); }}
            className="text-sm font-medium text-[#243746] underline underline-offset-4 hover:text-[#7FA8D6]">Same as Partner 1</button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <SignSelect label="Partner 1" value={signs[0]} onChange={(v) => setSigns([v, signs[1]])} />
          <SignSelect label="Partner 2" value={signs[1]} onChange={(v) => setSigns([signs[0], v])} />
        </div>
      )}
      {step === 4 && (
        <div className="space-y-5">
          {estimate ? (
            <>
              <div className="rounded-2xl bg-[#FFF7D6] p-5">
                <p className="text-sm text-[#243746]/80">Venues like yours usually start from</p>
                <p className="mt-1 font-serif text-3xl text-[#243746]">
                  {range(estimate.low, stretch ? estimate.high * 1.5 : estimate.high, estimate.currency) ?? symbols(stretch ? estimate.stretchTiers : estimate.tiers)}
                </p>
                <p className="mt-1 text-sm text-[#243746]/80">Price level {symbols(stretch ? estimate.stretchTiers : estimate.tiers)}, based on {estimate.count} venues in {placeName}.</p>
              </div>
              <label className="flex items-center gap-3 text-sm text-[#243746]">
                <input type="checkbox" checked={stretch} onChange={(e) => setStretch(e.target.checked)} className="h-4 w-4 accent-[#243746]" />
                Stretch my budget a little
              </label>
            </>
          ) : (
            <p className="rounded-2xl bg-[#FFF7D6] p-5 text-sm text-[#243746]">
              There aren't enough priced venues in {placeName} to give you a range yet, so we'll show every price.
            </p>
          )}
        </div>
      )}
    </Shell>
  );
}

export function VendorQuiz({ open, onOpenChange, photo, availableGroups, onApply }: {
  open: boolean; onOpenChange: (v: boolean) => void; photo?: string; availableGroups: string[]; onApply: (a: VendorAnswers) => void;
}) {
  const [step, setStep] = useState(0);
  const [p1, setP1] = useState<string[]>([]);
  const [p2, setP2] = useState<string[]>([]);
  const [stance, setStance] = useState<Record<string, Stance>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setStep(0); setError(null); } }, [open]);

  const groups = VENDOR_GROUPS.filter((g) => availableGroups.includes(g.key));
  const union = Array.from(new Set([...p1, ...p2]));

  const next = () => {
    if (step === 0 && p1.length === 0) { setError("Pick the one thing you would never compromise on."); return; }
    if (step === 1 && p2.length === 0) { setError("Pick one, or tap \"Same as Partner 1\"."); return; }
    setError(null);
    if (step < 2) { setStep(step + 1); return; }
    onApply({ p1, p2, stance });
    onOpenChange(false);
  };

  const picker = (value: string[], set: (v: string[]) => void) => (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => <Chip key={g.key} on={value.includes(g.key)} onClick={() => { set(toggle(value, g.key)); setError(null); }}>{g.label}</Chip>)}
    </div>
  );

  return (
    <Shell open={open} onOpenChange={onOpenChange} photo={photo} steps={["Partner 1", "Partner 2", "Splurge or save"]} step={step} error={error}
      title={["Partner 1: what would you never compromise on?", "Partner 2: and you?", "Where would you splurge, and where save?"][step]}
      hint={["Pick up to two. Either of you can answer for both.", "Or tap \"Same as Partner 1\" if you're agreed.", "This sets the price level we show for each one. You can change it any time."][step]}
      onBack={() => { setStep(step - 1); setError(null); }} onNext={next} nextLabel={step === 2 ? "See my matches" : "Next"}>
      {step === 0 && picker(p1, setP1)}
      {step === 1 && (
        <div className="space-y-4">
          {picker(p2, setP2)}
          <button type="button" data-static onClick={() => { setP2(p1); setError(null); }}
            className="text-sm font-medium text-[#243746] underline underline-offset-4 hover:text-[#7FA8D6]">Same as Partner 1</button>
        </div>
      )}
      {step === 2 && (
        <ul className="space-y-4">
          {union.map((k) => (
            <li key={k}>
              <p className="mb-2 text-sm font-medium text-[#243746]">{groupLabel(k)}</p>
              <div className="flex flex-wrap gap-2">
                {STANCES.map((s) => <Chip key={s.key} on={(stance[k] ?? "balanced") === s.key} onClick={() => setStance({ ...stance, [k]: s.key })}>{s.label}</Chip>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
