import { PRICE_TIERS } from "@/lib/price-tiers";

// A single $ tier, not a min/max range — 5 chips shown at once (not tucked
// behind a dropdown click) so the choice is visible up front. Clicking the
// already-selected chip clears it, since price is optional everywhere this
// is used.
export function PriceTierPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRICE_TIERS.map((t) => {
        const tierValue = String(t.min);
        const active = value === tierValue;
        return (
          <button key={t.symbol} type="button" onClick={() => onChange(active ? "" : tierValue)}
            className={`rounded-full px-4 py-2 text-sm font-medium cursor-pointer border transition-colors ${
              // hover:border-clay would look identical to the active state —
              // --color-clay resolves to the same hex as --ink in this theme
              // — so hover gets its own, clearly distinct light-fill treatment.
              active ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone"
            }`}>
            {t.symbol}
          </button>
        );
      })}
    </div>
  );
}
