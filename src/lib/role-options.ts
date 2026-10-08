import { HeartHandshake, Building2, Store, ShoppingBag, ClipboardList } from "lucide-react";
import type { AppRole } from "@/hooks/use-active-role";

// The ways someone can use WedThread. Shared by the sign-up form (chosen before the verification email
// is sent) and the role page (used when adding another role later).
// `comingSoon` options are shown but cannot be chosen yet. Remove the flag to open one up.
export const ROLE_OPTIONS: { role: AppRole; label: string; desc: string; icon: any; comingSoon?: boolean }[] = [
  { role: "couple",  label: "Getting married", desc: "Plan ceremonies, guests, seating, and your website.", icon: HeartHandshake },
  { role: "venue",   label: "List a venue",    desc: "Reach couples planning a destination wedding.",       icon: Building2 },
  { role: "vendor",  label: "List services",   desc: "Photographers, planners, mehendi artists, florists.", icon: Store },
  { role: "planner", label: "Planner",         desc: "Coordinate every couple you work with, side by side.", icon: ClipboardList, comingSoon: true },
  { role: "seller",  label: "Sell items",      desc: "Resell décor, dresses, tableware after your day.",    icon: ShoppingBag, comingSoon: true },
];
