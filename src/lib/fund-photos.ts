import honeymoon from "@/assets/features/registry-honeymoon.webp";
import gifts from "@/assets/features/registry-hero.webp";
import cosy from "@/assets/features/guest-list-hero.webp";

// A fund with no photo of its own still gets a nice one: a beach for a honeymoon, a couple on the grass for a home,
// wrapped gifts for anything else. A photo the couple adds always wins.
export function defaultFundPhoto(title: string | null | undefined): string {
  const t = (title ?? "").toLowerCase();
  if (/honeymoon|travel|trip|holiday|vacation|flight/.test(t)) return honeymoon;
  if (/home|house|nest|apartment|flat|furnish/.test(t)) return cosy;
  return gifts;
}
