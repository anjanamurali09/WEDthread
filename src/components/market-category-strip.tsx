import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { VENDOR_GROUPS } from "@/lib/vendor-groups";
import { cn } from "@/lib/utils";

// The row of round icons under the header on the venue and vendor pages: Venues first, then the vendor groups.
// The one for the page you're on is filled in the brand yellow.
export function MarketCategoryStrip({ active }: { active: "venues" | string | null }) {
  const items = [
    { key: "venues", label: "Venues", icon: Building2, to: "/venue", search: undefined as undefined | { group: string } },
    ...VENDOR_GROUPS.map((g) => ({ key: g.key, label: g.label, icon: g.icon, to: "/v", search: { group: g.key } })),
  ];
  return (
    <nav aria-label="Browse by type" className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-2 md:-mx-12 md:px-12">
      {items.map(({ key, label, icon: Icon, to, search }) => (
        <Link key={key} to={to as any} search={search as any} data-static
          className="group flex w-[92px] shrink-0 flex-col items-center gap-2 text-center">
          <span className={cn("grid h-14 w-14 place-items-center rounded-full border transition-colors",
            active === key ? "border-[#FFE08A] bg-[#FFE08A] text-[#243746]" : "border-line bg-paper text-[#243746] group-hover:bg-[#FFF7D6]")}>
            <Icon className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <span className={cn("text-[13px] leading-tight text-[#243746]", active === key && "font-medium")}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
