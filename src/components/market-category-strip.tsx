import { Link } from "@tanstack/react-router";
import { Sofa, Trees, Waves, UtensilsCrossed, Building, Tractor, Umbrella } from "lucide-react";
import { VENDOR_GROUPS } from "@/lib/vendor-groups";
import { cn } from "@/lib/utils";

type Icon = typeof Sofa;
type StripItem = { key: string; label: string; icon: Icon; to?: string; search?: { group: string }; onClick?: () => void };

// The row of round icons under the header. On the vendor page it is the vendor groups (photographers, florists...),
// on the venue page it is the kinds of space (indoor, outdoor, poolside...). The one that is selected is filled in
// the brand yellow.
function Strip({ items, active, label }: { items: StripItem[]; active: string[]; label: string }) {
  const bubble = (key: string) => cn("grid h-14 w-14 place-items-center rounded-full border transition-colors",
    active.includes(key) ? "border-[#FFE08A] bg-[#FFE08A] text-[#243746]" : "border-line bg-paper text-[#243746] group-hover:bg-[#FFF7D6]");
  const text = (key: string) => cn("text-balance px-1 text-[13px] leading-tight text-[#243746]", active.includes(key) && "font-medium");
  const cell = "group flex w-[7.25rem] shrink-0 cursor-pointer flex-col items-center gap-2 text-center";
  return (
    <nav aria-label={label} className="no-scrollbar -mx-6 flex gap-1 overflow-x-auto px-6 pb-2 md:-mx-12 md:px-12">
      {items.map(({ key, label: name, icon: Icon, to, search, onClick }) => {
        const inner = (
          <>
            <span className={bubble(key)}><Icon className="h-6 w-6" strokeWidth={1.6} /></span>
            <span className={text(key)}>{name}</span>
          </>
        );
        return to ? (
          <Link key={key} to={to as any} search={search as any} data-static className={cell}>{inner}</Link>
        ) : (
          <button key={key} type="button" onClick={onClick} data-static aria-pressed={active.includes(key)} className={cell}>{inner}</button>
        );
      })}
    </nav>
  );
}

export function VendorCategoryStrip({ active }: { active: string | null }) {
  const items = VENDOR_GROUPS.map((g) => ({ key: g.key, label: g.label, icon: g.icon, to: "/v", search: { group: g.key } }));
  return <Strip items={items} active={active ? [active] : []} label="Browse vendors by type" />;
}

// One icon for each kind of space a venue can list. Choosing one shows only venues of that kind; choosing it
// again takes the choice off.
const SPACE_ICONS: Record<string, Icon> = {
  Indoor: Sofa, Outdoor: Trees, Poolside: Waves, "Banquet hall": UtensilsCrossed, Rooftop: Building, Farmhouse: Tractor, Beach: Umbrella,
};

export function VenueSpaceStrip({ spaces, selected, onToggle }: { spaces: string[]; selected: string[]; onToggle: (space: string) => void }) {
  const items = spaces.map((s) => ({ key: s, label: s, icon: SPACE_ICONS[s] ?? Building, onClick: () => onToggle(s) }));
  return <Strip items={items} active={selected} label="Browse venues by type of space" />;
}
