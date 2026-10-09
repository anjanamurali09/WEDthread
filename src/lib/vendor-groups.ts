import { Camera, Video, Sparkles, Music, Flower2, UtensilsCrossed, ClipboardList, CakeSlice, Shirt, Car } from "lucide-react";

// The vendor categories in the database are many and overlapping ("Photography", "Photographer", "Photography &
// Film"...). Couples browse by a short list instead, so each group here gathers every category whose name matches.
export type VendorGroup = { key: string; label: string; icon: typeof Camera; match: RegExp };

export const VENDOR_GROUPS: VendorGroup[] = [
  { key: "photographers", label: "Photographers", icon: Camera, match: /photograph|drone|photo booth/i },
  { key: "videographers", label: "Videographers", icon: Video, match: /video|film/i },
  { key: "beauty", label: "Beauty", icon: Sparkles, match: /makeup|hair|mehendi|henna|nail|beauty/i },
  { key: "music", label: "Bands and DJs", icon: Music, match: /\bdj\b|music|band|baraat|dhol|string quartet|\bmc\b|entertainment/i },
  { key: "florists", label: "Florists and decor", icon: Flower2, match: /flor|d[eé]cor|mandap|chuppah|lighting|rentals/i },
  { key: "caterers", label: "Caterers", icon: UtensilsCrossed, match: /cater|bar service|food station/i },
  { key: "planners", label: "Planners", icon: ClipboardList, match: /plan|coordinator/i },
  { key: "cakes", label: "Cakes and desserts", icon: CakeSlice, match: /cake|dessert|mithai/i },
  { key: "attire", label: "Attire", icon: Shirt, match: /wear|sherwani|suit|bridesmaid|jewel|attire/i },
  { key: "transport", label: "Transport", icon: Car, match: /transport|car hire|shuttle|vehicle/i },
];

export function groupByKey(key: string | undefined) {
  return VENDOR_GROUPS.find((g) => g.key === key);
}

// Category ids (from the `useVendorCategories` options) that belong to a group.
export function categoryIdsForGroup(categories: { value: string; label: string }[], key: string | undefined): string[] {
  const g = groupByKey(key);
  return g ? categories.filter((c) => g.match.test(c.label)).map((c) => c.value) : [];
}

// True when a vendor (by its category names) belongs to the group.
export function inGroup(categoryNames: string[], key: string): boolean {
  const g = groupByKey(key);
  return !!g && categoryNames.some((n) => g.match.test(n));
}
