import { Dropdown } from "@/components/dropdown";
import { CURRENCIES, formatAmountInput } from "@/lib/currency";

// A real currency amount + its own currency picker, side by side — for
// the venue detail page's "Pricing" section (starting price, minimum
// spend), separate from the $-to-$$$$$ tier used on marketplace cards.
export function AmountCurrencyField({ label, amount, onAmountChange, currency, onCurrencyChange, amountPlaceholder }: {
  label: string;
  amount: string; onAmountChange: (v: string) => void;
  currency: string; onCurrencyChange: (v: string) => void;
  amountPlaceholder?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">{label}</span>
        <input value={amount} onChange={(e) => onAmountChange(formatAmountInput(e.target.value, currency))} placeholder={amountPlaceholder ?? "0"}
          inputMode="decimal"
          className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">Currency</span>
        <div className="mt-1">
          <Dropdown value={currency} onChange={onCurrencyChange} placeholder="Currency"
            options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.label} (${c.symbol})` }))} />
        </div>
      </label>
    </div>
  );
}
