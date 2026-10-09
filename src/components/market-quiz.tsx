import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PRICE_TIERS } from "@/lib/price-tiers";
import { VENDOR_GROUPS } from "@/lib/vendor-groups";
import { cn } from "@/lib/utils";

// The short quiz on the venue and vendor pages: two steps, then the page filters itself to the answers.
export type VenueAnswers = { guests: number | null; spaces: string[]; tiers: string[] };
export type VendorAnswers = { groups: string[]; tiers: string[] };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} data-static
      className={cn("rounded-full border px-4 py-2 text-sm transition-colors",
        on ? "border-[#243746] bg-[#FFF7D6] font-medium" : "border-line bg-paper hover:border-[#243746]")}>
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
                  <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs",
                      i === step ? "border-[#243746] bg-[#243746] text-[#FFF7D6]" : "border-line text-muted-foreground")}>{i + 1}</span>
                    <span className={cn("whitespace-nowrap", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
                    {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
                  </li>
                ))}
              </ol>
            </div>
            <DialogTitle className="mt-10 font-serif text-3xl leading-tight text-[#243746]">{title}</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">{hint}</DialogDescription>
            <div className="mt-6 flex-1">{children}</div>
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

const TierChips = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {PRICE_TIERS.map((t, i) => <Chip key={t.symbol} on={value.includes(String(i))} onClick={() => onChange(toggle(value, String(i)))}>{t.symbol}</Chip>)}
  </div>
);

export function VenueQuiz({ open, onOpenChange, photo, initialGuests, spaceOptions, onApply }: {
  open: boolean; onOpenChange: (v: boolean) => void; photo?: string; initialGuests?: number | null; spaceOptions: string[];
  onApply: (a: VenueAnswers) => void;
}) {
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [spaces, setSpaces] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setStep(0); setError(null); if (initialGuests && !guests) setGuests(String(initialGuests)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const next = () => {
    if (step === 0) {
      if (!deciding && !(Number(guests) > 0)) { setError("Enter a guest count, or tick that you're still deciding."); return; }
      setError(null); setStep(1); return;
    }
    onApply({ guests: deciding || !(Number(guests) > 0) ? null : Math.round(Number(guests)), spaces, tiers });
    onOpenChange(false);
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} photo={photo} steps={["Your wedding", "Find venues"]} step={step} error={error}
      title={step === 0 ? "How many guests are you expecting?" : "What kind of space do you picture?"}
      hint={step === 0 ? "A best guess is fine. You can change it later." : "Pick as many as you like, and a budget if you have one."}
      onBack={() => { setStep(0); setError(null); }} onNext={next} nextLabel={step === 0 ? "Next" : "See matching venues"}>
      {step === 0 ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[#243746]">Guest count
            <input type="number" min={1} inputMode="numeric" value={guests} disabled={deciding}
              onChange={(e) => { setGuests(e.target.value); setError(null); }}
              className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#FFE08A] disabled:opacity-50" />
          </label>
          <label className="flex items-center gap-3 text-sm text-[#243746]">
            <input type="checkbox" checked={deciding} onChange={(e) => { setDeciding(e.target.checked); setError(null); }} className="h-4 w-4 accent-[#243746]" />
            We're still deciding
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {spaceOptions.map((s) => <Chip key={s} on={spaces.includes(s)} onClick={() => setSpaces(toggle(spaces, s))}>{s}</Chip>)}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-[#243746]">Budget</p>
            <TierChips value={tiers} onChange={setTiers} />
          </div>
        </div>
      )}
    </Shell>
  );
}

export function VendorQuiz({ open, onOpenChange, photo, availableGroups, onApply }: {
  open: boolean; onOpenChange: (v: boolean) => void; photo?: string; availableGroups: string[]; onApply: (a: VendorAnswers) => void;
}) {
  const [step, setStep] = useState(0);
  const [groups, setGroups] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setStep(0); setError(null); } }, [open]);

  const next = () => {
    if (step === 0) {
      if (groups.length === 0) { setError("Pick at least one thing you're looking for."); return; }
      setError(null); setStep(1); return;
    }
    onApply({ groups, tiers });
    onOpenChange(false);
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} photo={photo} steps={["Your wedding", "Find vendors"]} step={step} error={error}
      title={step === 0 ? "Who are you looking to book?" : "What's your budget for them?"}
      hint={step === 0 ? "Pick as many as you like." : "Pick any that fit, or skip it to see every price."}
      onBack={() => { setStep(0); setError(null); }} onNext={next} nextLabel={step === 0 ? "Next" : "See matching vendors"}>
      {step === 0 ? (
        <div className="flex flex-wrap gap-2">
          {VENDOR_GROUPS.filter((g) => availableGroups.includes(g.key)).map((g) => (
            <Chip key={g.key} on={groups.includes(g.key)} onClick={() => { setGroups(toggle(groups, g.key)); setError(null); }}>{g.label}</Chip>
          ))}
        </div>
      ) : (
        <TierChips value={tiers} onChange={setTiers} />
      )}
    </Shell>
  );
}
