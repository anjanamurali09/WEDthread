import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays, Users, Grid3x3, Armchair, Globe, ArrowRight, MessageCircle, Wallet, Utensils,
  Gift, GripVertical, X, Plus,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { formatNumber, cn } from "@/lib/utils";
import { ResizeHandle } from "@/components/resize-handle";

export type WidgetType =
  | "events" | "guests" | "rsvps" | "website" | "budget" | "menu" | "seating" | "registry"
  | "discover_venues" | "discover_vendors" | "whatsapp";

export type WidgetSize = "small" | "medium" | "full";
const SIZE_ORDER: WidgetSize[] = ["small", "medium", "full"];
const SIZE_SPAN: Record<WidgetSize, 1 | 2 | 4> = { small: 1, medium: 2, full: 4 };
const SPAN_CLASS: Record<1 | 2 | 4, string> = {
  1: "",
  2: "md:col-span-2",
  4: "md:col-span-2 xl:col-span-4",
};

// Stored in weddings.dashboard_layout (jsonb) as DashboardLayoutEntry[], ordered by
// `position`. `position` is kept as an explicit field (not just implied by array index)
// so the stored shape stays self-describing even if entries are ever read out of order.
export type DashboardLayoutEntry = { widgetId: WidgetType; position: number; size: WidgetSize };

const WIDGET_META: Record<WidgetType, { label: string }> = {
  events: { label: "Events" },
  guests: { label: "Guests" },
  rsvps: { label: "RSVPs" },
  website: { label: "Website" },
  budget: { label: "Budget" },
  menu: { label: "Menu" },
  seating: { label: "Seating" },
  registry: { label: "Registry" },
  discover_venues: { label: "Discover: Destination venues" },
  discover_vendors: { label: "Discover: Vendors near your ceremonies" },
  whatsapp: { label: "WhatsApp: Automated guest messages" },
};

// Default size the FIRST time a widget is added (or for a wedding with no saved layout
// yet) — matches each widget's original fixed size before resizing existed.
const DEFAULT_SIZE: Record<WidgetType, WidgetSize> = {
  events: "small", guests: "small", rsvps: "small", website: "small",
  budget: "small", menu: "small", registry: "small",
  seating: "medium", discover_venues: "medium", discover_vendors: "medium",
  whatsapp: "full",
};

const DEFAULT_ORDER: WidgetType[] = [
  "events", "guests", "rsvps", "website", "discover_venues", "discover_vendors", "whatsapp",
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutEntry[] = DEFAULT_ORDER.map((widgetId, i) => ({
  widgetId, position: i, size: DEFAULT_SIZE[widgetId],
}));

// weddings.dashboard_layout used to store a flat WidgetType[] (order only, no size —
// from before resizing existed). No migration needed for this: it's already a jsonb
// column, so both shapes just need to be readable in code. This normalizes either shape
// into the current DashboardLayoutEntry[] — an old saved layout keeps working and gets
// upgraded to the new shape the next time the couple reorders/resizes/adds/removes anything.
export function normalizeDashboardLayout(raw: unknown): DashboardLayoutEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_DASHBOARD_LAYOUT;
  if (typeof raw[0] === "string") {
    return (raw as string[])
      .filter((id): id is WidgetType => id in WIDGET_META)
      .map((widgetId, i) => ({ widgetId, position: i, size: DEFAULT_SIZE[widgetId] }));
  }
  return (raw as Partial<DashboardLayoutEntry>[])
    .filter((e): e is { widgetId: WidgetType } & Partial<DashboardLayoutEntry> =>
      !!e && typeof e.widgetId === "string" && (e.widgetId as string) in WIDGET_META)
    .map((e, i) => ({
      widgetId: e.widgetId,
      position: typeof e.position === "number" ? e.position : i,
      size: e.size && SIZE_ORDER.includes(e.size) ? e.size : DEFAULT_SIZE[e.widgetId],
    }))
    .sort((a, b) => a.position - b.position);
}

export type WidgetContext = {
  wedding: any;
  events: any[];
  guestsCount: number;
  attending: number;
  totalInvites: number;
  rsvpd: number;
  budgetSpent: number;
  budgetCurrency: string;
  menuItems: number;
  menuSections: number;
  seatingTables: number;
  seatingSeated: number;
  registryItems: number;
  hasRegistry: boolean;
};

function StatBody({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-clay" />
      </div>
      <p className="mt-3 font-serif text-4xl">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </>
  );
}

function widgetLink(type: WidgetType): any {
  switch (type) {
    case "events": return "/events";
    case "guests": return "/guests";
    case "rsvps": return "/seating";
    case "website": return "/website";
    case "budget": return "/budget";
    case "menu": return "/menu";
    case "seating": return "/seating";
    case "registry": return "/registry";
    case "discover_venues": return "/venues";
    case "discover_vendors": return "/vendors";
    case "whatsapp": return "/messages";
  }
}

function WidgetBody({ type, ctx }: { type: WidgetType; ctx: WidgetContext }) {
  const { wedding, events, guestsCount, attending, totalInvites, rsvpd, budgetSpent, budgetCurrency, menuItems, menuSections, seatingTables, seatingSeated, registryItems, hasRegistry } = ctx;

  switch (type) {
    case "events":
      return <StatBody icon={CalendarDays} label="Events" value={formatNumber(events.length)} sub={events.length === 1 ? "ceremony" : "ceremonies"} />;
    case "guests":
      return <StatBody icon={Users} label="Guests" value={formatNumber(guestsCount)} sub={`${formatNumber(attending)} attending`} />;
    case "rsvps":
      return <StatBody icon={Grid3x3} label="RSVPs" value={`${totalInvites ? Math.round((rsvpd / totalInvites) * 100) : 0}%`} sub={`${formatNumber(rsvpd)} of ${formatNumber(totalInvites)} responded`} />;
    case "website":
      return <StatBody icon={Globe} label="Website" value={wedding.site_published ? "Live" : "Draft"} sub={`/w/${wedding.slug ?? "-"}`} />;
    case "budget":
      return <StatBody icon={Wallet} label="Budget" value={formatMoney(budgetSpent, budgetCurrency)} sub={wedding.budget_limit != null ? `of ${formatMoney(wedding.budget_limit, budgetCurrency)}` : "spent so far"} />;
    case "menu":
      return <StatBody icon={Utensils} label="Menu" value={formatNumber(menuItems)} sub={`across ${formatNumber(menuSections)} section${menuSections === 1 ? "" : "s"}`} />;
    case "seating":
      return <StatBody icon={Armchair} label="Seating" value={formatNumber(seatingTables)} sub={`${seatingTables === 1 ? "table" : "tables"} · ${formatNumber(seatingSeated)} seated`} />;
    case "registry":
      return <StatBody icon={Gift} label="Registry" value={formatNumber(registryItems)} sub={hasRegistry ? "items added" : "not set up yet"} />;
    case "discover_venues":
      return (
        <>
          <p className="text-[10px] uppercase tracking-widest text-clay">Discover</p>
          <h3 className="font-serif text-2xl mt-1">Destination venues</h3>
          <p className="mt-2 text-sm text-muted-foreground">Palaces, beach resorts, vineyards, hill retreats.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-clay uppercase tracking-widest">Browse venues <ArrowRight className="h-3 w-3" /></span>
        </>
      );
    case "discover_vendors":
      return (
        <>
          <p className="text-[10px] uppercase tracking-widest text-clay">Discover</p>
          <h3 className="font-serif text-2xl mt-1">Vendors near your ceremonies</h3>
          <p className="mt-2 text-sm text-muted-foreground">Planners, photographers, mehendi artists, florists.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-clay uppercase tracking-widest">Browse vendors <ArrowRight className="h-3 w-3" /></span>
        </>
      );
    case "whatsapp":
      return (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-clay inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</p>
            <h3 className="font-serif text-2xl mt-1">Automated guest messages</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">Save-the-dates, RSVP requests, T-7 reminders and thank-yous.</p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-clay uppercase tracking-widest shrink-0">Open messaging <ArrowRight className="h-3 w-3" /></span>
        </div>
      );
  }
}

// Strict 3-step cycle, not a delta/drag computation — always advances exactly one tier
// from whatever the widget's CURRENT size actually is (looked up fresh via indexOf on
// every click), so it can never skip a step or drift based on click position/speed.
// small -> medium -> full -> small, wrapping with modulo.
function nextWidgetSize(size: WidgetSize): WidgetSize {
  const idx = SIZE_ORDER.indexOf(size);
  return SIZE_ORDER[(idx + 1) % SIZE_ORDER.length];
}

function SortableWidgetCard({ type, size, ctx, onRemove, onResize }: {
  type: WidgetType; size: WidgetSize; ctx: WidgetContext; onRemove: () => void; onResize: (size: WidgetSize) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: type });
  const meta = WIDGET_META[type];
  const isWide = size === "full";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(SPAN_CLASS[SIZE_SPAN[size]], "relative group")}
    >
      <Link
        to={widgetLink(type)}
        className={cn(
          "paper-card hover:shadow-md transition-shadow block h-full",
          isWide ? "p-6 md:p-8" : "p-5",
        )}
      >
        <WidgetBody type={type} ctx={ctx} />
      </Link>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          title={`Remove ${meta.label}`}
          className="grid h-6 w-6 place-items-center rounded-full bg-paper/90 border border-line text-muted-foreground hover:text-cherry hover:border-cherry cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          {...attributes} {...listeners}
          onClick={(e) => e.preventDefault()}
          title="Drag to reorder"
          className="grid h-6 w-6 place-items-center rounded-full bg-paper/90 border border-line text-muted-foreground hover:text-ink cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <ResizeHandle
        cursor="cursor-pointer"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onResize(nextWidgetSize(size)); }}
        title={`Resize (${size} → ${nextWidgetSize(size)})`}
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}

function AddWidgetTile({ available, onAdd }: { available: WidgetType[]; onAdd: (t: WidgetType) => void }) {
  const [open, setOpen] = useState(false);
  if (available.length === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-full min-h-[132px] rounded-3xl border border-dashed border-line text-muted-foreground hover:border-clay hover:text-clay transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm uppercase tracking-widest">Add widget</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-20 min-w-[240px] rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {available.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { onAdd(t); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer"
              >
                {WIDGET_META[t].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardWidgetGrid({ layout, ctx, onLayoutChange }: {
  layout: DashboardLayoutEntry[]; ctx: WidgetContext; onLayoutChange: (next: DashboardLayoutEntry[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const activeIds = layout.map((e) => e.widgetId);
  const available = (Object.keys(WIDGET_META) as WidgetType[]).filter((t) => !activeIds.includes(t));

  const reindex = (entries: DashboardLayoutEntry[]) => entries.map((e, i) => ({ ...e, position: i }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = layout.findIndex((x) => x.widgetId === active.id);
    const newIdx = layout.findIndex((x) => x.widgetId === over.id);
    onLayoutChange(reindex(arrayMove(layout, oldIdx, newIdx)));
  };

  const onResize = (widgetId: WidgetType, size: WidgetSize) => {
    onLayoutChange(layout.map((e) => (e.widgetId === widgetId ? { ...e, size } : e)));
  };

  return (
    <section className="mt-8">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={activeIds} strategy={rectSortingStrategy}>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {layout.map((entry) => (
              <SortableWidgetCard
                key={entry.widgetId}
                type={entry.widgetId}
                size={entry.size}
                ctx={ctx}
                onRemove={() => onLayoutChange(reindex(layout.filter((e) => e.widgetId !== entry.widgetId)))}
                onResize={(size) => onResize(entry.widgetId, size)}
              />
            ))}
            <AddWidgetTile
              available={available}
              onAdd={(t) => onLayoutChange([...layout, { widgetId: t, position: layout.length, size: DEFAULT_SIZE[t] }])}
            />
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
