export type CurrencyCode = "USD" | "GBP" | "EUR" | "INR" | "AED" | "AUD" | "CAD";

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string; locale: string }> = {
  USD: { symbol: "$", label: "US Dollar", locale: "en-US" },
  GBP: { symbol: "£", label: "British Pound", locale: "en-GB" },
  EUR: { symbol: "€", label: "Euro", locale: "de-DE" },
  INR: { symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
  AED: { symbol: "AED", label: "UAE Dirham", locale: "en-AE" },
  AUD: { symbol: "A$", label: "Australian Dollar", locale: "en-AU" },
  CAD: { symbol: "C$", label: "Canadian Dollar", locale: "en-CA" },
};

export function formatMoney(amount: number, code: string): string {
  const c = CURRENCIES[code as CurrencyCode] ?? CURRENCIES.USD;
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${c.symbol}${amount.toLocaleString("en-US")}`;
  }
}

// Live thousands-grouping for a plain-number input field, using each currency's own
// locale — en-IN groups as lakhs/crores (15,00,000), everything else as standard
// 3-digit groups (1,500,000). Keeps at most one decimal point and 2 decimal places;
// strips everything else, so it's safe to call on every keystroke.
export function formatAmountInput(raw: string, code: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const firstDot = cleaned.indexOf(".");
  const intPart = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
  const decPart = firstDot === -1 ? "" : "." + cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
  if (intPart === "") return decPart;
  const locale = CURRENCIES[code as CurrencyCode]?.locale ?? "en-US";
  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(intPart));
  return grouped + decPart;
}

// Inverse of formatAmountInput — strips grouping back out to a plain number.
export function parseAmountInput(formatted: string): number {
  const cleaned = formatted.replace(/[^\d.]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

// Grouped number without the currency symbol/code — for a display where the
// currency is already shown separately (e.g. next to its own picker button).
export function formatAmountDisplay(amount: number, code: string): string {
  const locale = CURRENCIES[code as CurrencyCode]?.locale ?? "en-US";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}
