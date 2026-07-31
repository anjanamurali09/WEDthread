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
