import { createFileRoute } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  useCurrentWedding, useEvents, useExpenses, useBudgetCategories, useBudgetCustomColumns,
  type Expense, type Event, type BudgetCategory, type BudgetCustomColumn,
} from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { toast } from "@/lib/toast";
import { Plus, Trash2, Pencil, Bell, Check, X, Wallet, ChevronDown, Settings, SlidersHorizontal, Download, PieChart as PieChartIcon, BarChart3, Columns3, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomColorButton } from "@/components/custom-color";
import { DatePicker } from "@/components/ui/datepicker";
import { TimePicker } from "@/components/ui/timepicker";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CURRENCIES, formatMoney, formatAmountInput, parseAmountInput, formatAmountDisplay, type CurrencyCode } from "@/lib/currency";
import { evalMathExpr } from "@/lib/math-expr";
import { Dropdown, type DropdownOption } from "@/components/dropdown";
import { exportBudgetExcel, exportBudgetPdf, customFieldDisplay } from "@/lib/budget-export";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/budget")({ component: BudgetPage });

const DEFAULT_CATEGORIES = [
  "Venue", "Food", "Photography", "Entertainment", "Decor", "Clothes",
  "Flowers", "Music & DJ", "Transportation", "Beauty", "Stationery", "Gifts & Favors",
];

const PAID_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "bride", label: "Bride" }, { value: "groom", label: "Groom" }, { value: "both", label: "Both" },
];

const CUSTOM_COLUMN_TYPES: { value: BudgetCustomColumn["type"]; label: string }[] = [
  { value: "text", label: "Text" }, { value: "number", label: "Number" }, { value: "date", label: "Date" }, { value: "boolean", label: "Yes / No" },
];

const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "Card", label: "Card" }, { value: "Cash", label: "Cash" }, { value: "Bank transfer", label: "Bank transfer" },
  { value: "UPI", label: "UPI" }, { value: "Cheque", label: "Cheque" }, { value: "Other", label: "Other" },
];

// Named chart color themes, same idea as the RSVP tracker's ColorThemePicker
// — a couple picks one per chart, remembered independently for each of the
// two breakdown widgets (By category / By paid by) rather than every bar
// defaulting to a fixed single hue.
type ChartTheme = { name: string; colors: string[] };
const CHART_THEMES: ChartTheme[] = [
  // The app's own palette (ink navy, cherry/sage blues, gold, a neutral
  // slate) rather than a generic web-safe color — the default, so charts
  // read as WEDthread's own by default.
  { name: "Brand", colors: ["#243746", "#7FA8D6", "#D9A03D", "#6B7A8F", "#4A7CAD", "#F5DBAE"] },
  { name: "Classic", colors: ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#14b8a6"] },
  { name: "Ocean", colors: ["#3b82f6", "#0ea5e9", "#06b6d4", "#0284c7", "#38bdf8", "#075985"] },
  { name: "Berry", colors: ["#a855f7", "#ec4899", "#d946ef", "#c026d3", "#f472b6", "#9333ea"] },
  { name: "Sunset", colors: ["#f59e0b", "#fb923c", "#ef4444", "#f97316", "#facc15", "#dc2626"] },
  { name: "Meadow", colors: ["#10b981", "#84cc16", "#22c55e", "#65a30d", "#4ade80", "#16a34a"] },
  { name: "Slate", colors: ["#64748b", "#475569", "#94a3b8", "#334155", "#cbd5e1", "#1e293b"] },
  { name: "Coral", colors: ["#fb923c", "#38bdf8", "#fbbf24", "#0ea5e9", "#f97316", "#0284c7"] },
  { name: "Lilac", colors: ["#c4b5fd", "#fdba74", "#a78bfa", "#fb923c", "#8b5cf6", "#f97316"] },
];
const CHART_THEME_KEY = "wedthread_budget_chart_theme";

function ChartColorThemePicker({ theme, onChange, customColors, onCustomChange }: { theme: ChartTheme; onChange: (t: ChartTheme) => void; customColors: string[]; onCustomChange: (colors: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-stone cursor-pointer">
        <span className="inline-flex -space-x-1">
          {theme.colors.slice(0, 3).map((c, i) => <span key={i} className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: c }} />)}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-20 w-44 max-h-72 overflow-y-auto rounded-2xl border border-line bg-white shadow-lg p-1.5">
            {CHART_THEMES.map((t) => (
              <button key={t.name} type="button" onClick={() => { onChange(t); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-stone cursor-pointer">
                <span className="inline-flex -space-x-1 shrink-0">
                  {t.colors.slice(0, 3).map((c, i) => <span key={i} className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: c }} />)}
                </span>
                <span className="flex-1 text-left">{t.name}</span>
                {t.name === theme.name && <Check className="h-3.5 w-3.5 text-ink shrink-0" />}
              </button>
            ))}
            {/* Custom: six slots, each its own hex/colour-wheel picker; editing any slot
                switches the chart to this custom palette. */}
            <div className="px-3 py-2 border-t border-line/60 mt-1">
              <p className="flex items-center justify-between text-sm">Custom {theme.name === "Custom" && <Check className="h-3.5 w-3.5 text-ink" />}</p>
              <div className="mt-1.5 flex items-center gap-1">
                {customColors.map((c, i) => (
                  <CustomColorButton key={i} className="h-4 w-4" value={c} active
                    onChange={(hex) => onCustomChange(customColors.map((x, j) => (j === i ? hex : x)))} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Shared by both the insert (addExpense) and the update (edit dialog) paths
// so a blank field always becomes a real null rather than "" — Postgres
// rejects "" for date/uuid columns (paid_date/due_date/event_id), which is
// exactly the "invalid input syntax for type date" error a naive pass-through
// of the form's empty strings used to produce on save.
function normalizeExpenseForm(form: {
  name: string; amount: number; description: string; category: string; status: "pending" | "paid";
  event_id: string; paid_by: string; payment_method: string; paid_date: string; due_date: string; custom_fields: Record<string, unknown>;
  reminder_at?: string | null;
  reminder_include_collaborators?: boolean;
}) {
  return {
    name: form.name.trim(),
    amount: Math.max(0, Math.round(form.amount)),
    description: form.description.trim() || null,
    category: form.category || null,
    status: form.status,
    event_id: form.event_id || null,
    paid_by: form.paid_by.trim() || null,
    payment_method: form.payment_method.trim() || null,
    paid_date: form.paid_date || null,
    due_date: form.due_date || null,
    custom_fields: form.custom_fields as any,
    // Only touches the reminder columns when a reminder was set or cleared, so saving an expense
    // that has no reminder never depends on them.
    ...(form.reminder_at ? { reminder_at: form.reminder_at, reminder_sent_at: null }
      : form.reminder_at === null ? { reminder_at: null, reminder_sent_at: null } : {}),
    // Same idea for "include collaborators": only written when it is being turned on, or turned off after having been on.
    ...(form.reminder_include_collaborators !== undefined ? { reminder_include_collaborators: form.reminder_include_collaborators } : {}),
  };
}

const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const round2 = (n: number) => Math.round(n * 100) / 100;

// Reformats on every keystroke, then restores the caret by digit count rather than
// raw character index — inserting/removing a comma mid-typing otherwise shoves the
// caret to the end after every keystroke, which makes editing a number you've
// already typed (not just appending to it) unusable.
function reformatKeepingCaret(e: React.ChangeEvent<HTMLInputElement>, currency: string, setValue: (v: string) => void) {
  const input = e.target;
  const digitsBeforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/[^\d]/g, "").length;
  const formatted = formatAmountInput(input.value, currency);
  setValue(formatted);
  requestAnimationFrame(() => {
    let count = 0;
    let pos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) count++;
      if (count === digitsBeforeCaret) { pos = i + 1; break; }
    }
    if (digitsBeforeCaret === 0) pos = 0;
    input.setSelectionRange(pos, pos);
  });
}

// Compact "AED ⌄" trigger meant to sit as the left segment of a combined
// currency+amount field — the couple can change currency right from wherever
// they're already typing an amount, not just from Settings.
function CurrencyPrefixButton({ value, onChange, triggerClassName }: { value: string; onChange: (code: string) => void; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} data-static
        className={cn("flex items-center gap-1 text-sm font-medium text-ink cursor-pointer hover:text-cherry", triggerClassName ?? "pl-4 pr-2 py-2.5")}>
        {value} <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-20 w-52 max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <button type="button" key={code} onClick={() => { onChange(code); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2", value === code && "font-medium")}>
                <span className="truncate">{code} · {c.label}</span>
                {value === code && <Check className="h-3.5 w-3.5 text-sage-deep shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Option = DropdownOption;

function CategoryDropdown({ value, onChange, categories, onCreate }: {
  value: string; onChange: (v: string) => void; categories: BudgetCategory[]; onCreate: (name: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const create = async () => {
    if (!draft.trim()) return;
    await onCreate(draft.trim());
    onChange(draft.trim());
    setDraft(""); setAdding(false);
  };
  return (
    <Dropdown
      size="sm"
      value={value} onChange={onChange} placeholder="Category"
      options={categories.map((c) => ({ value: c.name, label: c.name }))}
      footer={
        adding ? (
          <div className="flex items-center gap-1.5 p-1">
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="New category" onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-lg border border-line px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay bg-paper" />
            <button type="button" onClick={(e) => { e.stopPropagation(); create(); }} className="rounded-lg bg-ink text-paper p-1.5 cursor-pointer"><Check className="h-3 w-3" /></button>
          </div>
        ) : (
          <button type="button" onClick={(e) => { e.stopPropagation(); setAdding(true); }}
            className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer text-clay flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add new category
          </button>
        )
      }
    />
  );
}

function FilterChip({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value);
  const isSet = value !== "";
  if (options.length === 0) return null;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
          isSet ? "bg-clay text-paper border-clay" : "bg-paper text-ink border-line hover:bg-stone",
        )}>
        {isSet ? active?.label ?? label : label} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 z-20 min-w-[170px] max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className={cn("w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-blush-soft cursor-pointer", !isSet && "font-medium")}>
              All {label.toLowerCase()}
            </button>
            {options.map((o) => (
              <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-blush-soft cursor-pointer", value === o.value && "font-medium")}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type VisibleCols = { category: boolean; description: boolean; event: boolean; paidBy: boolean; status: boolean };
const DEFAULT_VISIBLE_COLS: VisibleCols = { category: true, description: true, event: true, paidBy: true, status: true };
const COLUMN_TOGGLES: { key: keyof VisibleCols; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "event", label: "Event" },
  { key: "paidBy", label: "Paid by" },
  { key: "status", label: "Status" },
];

// Which fields show per expense row — separate from the Category/Paid by/etc.
// filters above, which narrow which rows appear; this only changes what's
// visible on the rows that are already showing.
function ColumnsPicker({ value, onChange }: { value: VisibleCols; onChange: (v: VisibleCols) => void }) {
  const [open, setOpen] = useState(false);
  const hiddenCount = COLUMN_TOGGLES.filter((c) => !value[c.key]).length;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer",
          hiddenCount > 0 ? "bg-clay text-paper border-clay" : "bg-paper text-ink border-line hover:bg-stone",
        )}>
        <Columns3 className="h-3 w-3" /> Columns <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 z-20 min-w-[170px] rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {COLUMN_TOGGLES.map((c) => (
              <button type="button" key={c.key} onClick={() => onChange({ ...value, [c.key]: !value[c.key] })}
                className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-xs rounded-xl hover:bg-blush-soft cursor-pointer">
                {c.label}
                {value[c.key] && <Check className="h-3.5 w-3.5 text-sage-deep shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenu({ onExportExcel, onExportPdf }: { onExportExcel: () => void; onExportPdf: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer focus:outline-none">
        <Download className="h-4 w-4" /> Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 min-w-[180px] rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button type="button" onClick={() => { onExportExcel(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer focus:outline-none">
              Export as Excel
            </button>
            <button type="button" onClick={() => { onExportPdf(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer focus:outline-none">
              Export as PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type BreakdownDimension = "category" | "paid_by" | "event" | "status";
const BREAKDOWN_DIMENSIONS: { value: BreakdownDimension; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "paid_by", label: "Paid by" },
  { value: "event", label: "Event" },
  { value: "status", label: "Status" },
];

function groupExpensesBy(expenses: Expense[], dimension: BreakdownDimension, events: Event[]): [string, number][] {
  const m = new Map<string, number>();
  expenses.forEach((e) => {
    const key =
      dimension === "category" ? (e.category || "Uncategorized") :
      dimension === "paid_by" ? (e.paid_by ? capitalize(e.paid_by) : "Unspecified") :
      dimension === "event" ? (e.event_id ? (events.find((ev) => ev.id === e.event_id)?.name ?? "Unknown event") : "No specific event") :
      (e.status === "paid" ? "Paid" : "Pending");
    m.set(key, (m.get(key) ?? 0) + e.amount);
  });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

// One reusable "spend broken down by X" widget — the couple picks both the grouping
// (category/paid by/event/status) and the chart shape. The overall budget total
// already shows once, on the Total spent card above; these widgets only ever chart
// what was actually spent, grouped whichever way is selected, so that number isn't
// repeated a second and third time here.
function ExpenseBreakdownWidget({ expenses, events, categories, money, defaultDimension }: {
  expenses: Expense[]; events: Event[]; categories: BudgetCategory[]; money: (n: number) => string; defaultDimension: BreakdownDimension;
}) {
  const [dimension, setDimension] = useState<BreakdownDimension>(defaultDimension);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [showBudget, setShowBudget] = useState(false);
  // Keyed by this widget's own starting dimension (its identity — "By category"
  // vs "By paid by") so each card remembers its own color choice independently
  // instead of the two cards sharing one theme.
  const themeKey = `${CHART_THEME_KEY}_${defaultDimension}`;
  const [customColors, setCustomColors] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`${themeKey}_custom`) ?? "null");
      if (Array.isArray(raw) && raw.length === 6) return raw;
    } catch {}
    return CHART_THEMES[0].colors;
  });
  const [theme, setTheme] = useState<ChartTheme>(() => {
    try {
      const saved = localStorage.getItem(themeKey);
      if (saved === "Custom") return { name: "Custom", colors: customColors };
      return CHART_THEMES.find((t) => t.name === saved) ?? CHART_THEMES[0];
    } catch { return CHART_THEMES[0]; }
  });
  const setCustomAndSave = (colors: string[]) => {
    setCustomColors(colors);
    try { localStorage.setItem(`${themeKey}_custom`, JSON.stringify(colors)); } catch {}
    setThemeAndSave({ name: "Custom", colors });
  };
  const setThemeAndSave = (t: ChartTheme) => {
    setTheme(t);
    try { localStorage.setItem(themeKey, t.name); } catch {}
  };

  // Only category and event have an allocated budget to compare against — paid_by and
  // status don't. A pie can't show "spent" and "budget" as two values per slice, so
  // comparing against budget always renders as a grouped bar chart instead.
  const canShowBudget = dimension === "category" || dimension === "event";
  const comparingBudget = canShowBudget && showBudget;

  const grouped = useMemo(() => groupExpensesBy(expenses, dimension, events), [expenses, dimension, events]);
  const data = useMemo(() => grouped.map(([name, spent]) => {
    if (!comparingBudget) return { name, spent };
    const budget = dimension === "category"
      ? categories.find((c) => c.name === name)?.allocated_amount ?? 0
      : events.find((e) => e.name === name)?.allocated_amount ?? 0;
    return { name, spent, budget };
  }), [grouped, comparingBudget, dimension, categories, events]);

  return (
    <div className="paper-card p-4 md:p-5 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm uppercase tracking-widest text-cherry">By {BREAKDOWN_DIMENSIONS.find((d) => d.value === dimension)?.label.toLowerCase()}</p>

        <div className="flex items-center gap-2 shrink-0">
          {canShowBudget && (
            <button type="button" onClick={() => setShowBudget((v) => !v)}
              className={cn("rounded-full border px-3 py-1 text-[10px] transition-colors cursor-pointer", showBudget ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
              vs Budget
            </button>
          )}
          <div className="inline-flex rounded-full border border-line p-0.5">
            <button type="button" onClick={() => setChartType("bar")} title="Bar chart"
              className={cn("rounded-full p-1.5 cursor-pointer", chartType === "bar" || comparingBudget ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setChartType("pie")} title="Pie chart" disabled={comparingBudget}
              className={cn(
                "rounded-full p-1.5",
                comparingBudget ? "text-muted-foreground/40 cursor-not-allowed"
                  : chartType === "pie" ? "bg-ink text-paper cursor-pointer"
                  : "text-muted-foreground hover:text-ink cursor-pointer",
              )}>
              <PieChartIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <ChartColorThemePicker theme={theme} onChange={setThemeAndSave} customColors={customColors} onCustomChange={setCustomAndSave} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {BREAKDOWN_DIMENSIONS.map((d) => (
          <button key={d.value} type="button" onClick={() => setDimension(d.value)}
            className={cn("rounded-full border px-3 py-1 text-[10px] transition-colors cursor-pointer", dimension === d.value ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1 min-h-[160px]">
        {data.length === 0 ? (
          <div className="h-full min-h-[160px] flex items-center justify-center text-center">
            <p className="text-sm text-muted-foreground max-w-[220px]">Log an expense to see it charted here.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={170}>
            {chartType === "bar" || comparingBudget ? (
              <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} tickLine={false} height={30} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                {comparingBudget && <Legend wrapperStyle={{ fontSize: 12 }} />}
                <Bar dataKey="spent" name="Spent" fill={theme.colors[0]} radius={[6, 6, 0, 0]}>
                  {/* Comparing against budget: "Spent" is one series next to "Budget", so it stays
                      one color to match the legend. Otherwise each bar is its own category/person —
                      cycle the theme so they're visually distinct, same as the pie chart's slices. */}
                  {!comparingBudget && data.map((_, i) => <Cell key={i} fill={theme.colors[i % theme.colors.length]} />)}
                </Bar>
                {comparingBudget && <Bar dataKey="budget" name="Budget" fill={theme.colors[1]} radius={[6, 6, 0, 0]} />}
              </BarChart>
            ) : (
              <PieChart>
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Pie data={data} dataKey="spent" nameKey="name" outerRadius={62}>
                  {data.map((_, i) => <Cell key={i} fill={theme.colors[i % theme.colors.length]} />)}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function BudgetPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: events = [], isLoading: eventsLoading } = useEvents(wedding?.id);
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(wedding?.id);
  const { data: categories = [], isLoading: categoriesLoading } = useBudgetCategories(wedding?.id);
  const { data: customColumns = [], isLoading: customColumnsLoading } = useBudgetCustomColumns(wedding?.id);
  const qc = useQueryClient();

  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState(wedding?.budget_limit != null ? formatAmountInput(String(wedding.budget_limit), wedding?.budget_currency ?? "USD") : "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaidBy, setFilterPaidBy] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  // Which columns are shown is remembered in this browser, so a refresh keeps the last choice.
  const [visibleCols, setVisibleCols] = usePersistedState<VisibleCols>("wedthread_budget_cols", DEFAULT_VISIBLE_COLS, (raw) => {
    const r = (raw ?? {}) as Partial<Record<keyof VisibleCols, unknown>>;
    return {
      category: r.category !== false, description: r.description !== false, event: r.event !== false,
      paidBy: r.paidBy !== false, status: r.status !== false,
    };
  });
  const [reminderExpense, setReminderExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const currency = wedding?.budget_currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);

  const invalidateExpenses = () => qc.invalidateQueries({ queryKey: ["expenses", wedding?.id] });
  const invalidateWedding = () => qc.invalidateQueries({ queryKey: ["current-wedding"] });

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const limit = wedding?.budget_limit ?? null;
  const pct = limit ? Math.round((totalSpent / limit) * 100) : null;
  const overBudget = pct !== null && pct > 100;

  const categoryTotals = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => {
      const key = e.category || "Uncategorized";
      m.set(key, (m.get(key) ?? 0) + e.amount);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Built from the distinct paid_by values actually present on this wedding's expenses
  // (not the fixed preset list), so custom "Other…" entries show up as filter options too.
  // Keyed case-insensitively (and trimmed) so "Groom" and "groom" typed on different
  // expenses collapse into one option instead of showing up as two identical-looking
  // entries — the filter itself compares the same way, below.
  const paidByOptions = useMemo(() => {
    const seen = new Map<string, string>();
    expenses.forEach((e) => {
      const trimmed = e.paid_by?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        const preset = PAID_BY_OPTIONS.find((o) => o.value === key);
        seen.set(key, preset?.label ?? capitalize(trimmed));
      }
    });
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [expenses]);

  const customColumnOptions = useMemo(() => {
    const m: Record<string, Option[]> = {};
    customColumns.forEach((col) => {
      const seen = new Set<string>();
      const opts: Option[] = [];
      if (col.type === "boolean") {
        opts.push({ value: "true", label: "Yes" }, { value: "false", label: "No" });
      } else {
        expenses.forEach((e) => {
          const raw = (e.custom_fields as Record<string, unknown>)?.[col.id];
          const display = customFieldDisplay(col, raw);
          if (display && !seen.has(display)) { seen.add(display); opts.push({ value: display, label: display }); }
        });
      }
      m[col.id] = opts;
    });
    return m;
  }, [customColumns, expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory && (e.category || "Uncategorized") !== filterCategory) return false;
      if (filterPaidBy && e.paid_by?.trim().toLowerCase() !== filterPaidBy) return false;
      if (filterEvent && e.event_id !== filterEvent) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      for (const col of customColumns) {
        const wanted = customFilters[col.id];
        if (!wanted) continue;
        const raw = (e.custom_fields as Record<string, unknown>)?.[col.id];
        const display = customFieldDisplay(col, raw);
        if (display !== wanted) return false;
      }
      return true;
    });
  }, [expenses, filterCategory, filterPaidBy, filterEvent, filterStatus, customFilters, customColumns]);

  const anyFilter = !!(filterCategory || filterPaidBy || filterEvent || filterStatus || Object.values(customFilters).some(Boolean));
  const clearFilters = () => { setFilterCategory(""); setFilterPaidBy(""); setFilterEvent(""); setFilterStatus(""); setCustomFilters({}); };

  const saveLimit = async () => {
    if (!wedding) return;
    const trimmed = limitDraft.trim();
    const n = trimmed === "" ? null : Math.max(0, Math.round(parseAmountInput(trimmed)));
    const { error } = await supabase.from("weddings").update({ budget_limit: n }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    setEditingLimit(false);
    invalidateWedding();
  };

  const changeCurrency = async (code: string) => {
    if (!wedding) return;
    const { error } = await supabase.from("weddings").update({ budget_currency: code }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    invalidateWedding();
  };

  const createCategory = async (name: string) => {
    if (!wedding) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const { error } = await supabase.from("budget_categories").insert({ wedding_id: wedding.id, name, sort_order: categories.length });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["budget-categories", wedding.id] });
  };

  const addExpense = async (form: ExpenseFormValues) => {
    if (!wedding) return;
    const { error } = await supabase.from("expenses").insert({ wedding_id: wedding.id, ...normalizeExpenseForm(form) });
    if (error) return toast.error(error.message);
    track("expense_added");
    invalidateExpenses();
  };

  // Updates the local cache immediately rather than waiting on invalidateExpenses'
  // refetch round-trip — that round-trip is what made toggling Paid/Pending (and any
  // other inline edit) visibly lag; only falls back to a real refetch if the write
  // itself fails, to pull the row back in sync with the server.
  const updateExpenseField = async (id: string, patch: Partial<Pick<Expense, "name" | "description" | "category" | "status" | "amount" | "event_id" | "paid_by" | "payment_method" | "paid_date" | "due_date" | "custom_fields" | "reminder_at" | "reminder_sent_at" | "reminder_include_collaborators">>) => {
    qc.setQueryData<Expense[]>(["expenses", wedding?.id], (old) => old?.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const { error } = await supabase.from("expenses").update(patch).eq("id", id);
    if (error) { toast.error(error.message); invalidateExpenses(); }
  };

  const toggleStatus = (exp: Expense) => updateExpenseField(exp.id, { status: exp.status === "paid" ? "pending" : "paid" });

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidateExpenses();
  };

  const completeOnboarding = async (patch: { budget_limit: number | null; budget_currency: string; categoryNames: string[] }) => {
    if (!wedding) return;
    const { error } = await supabase.from("weddings").update({
      budget_limit: patch.budget_limit, budget_currency: patch.budget_currency, budget_setup_completed: true,
    }).eq("id", wedding.id);
    if (error) { toast.error(error.message); return; }
    if (patch.categoryNames.length) {
      const { error: catError } = await supabase.from("budget_categories").insert(
        patch.categoryNames.map((name, i) => ({ wedding_id: wedding.id, name, sort_order: i })),
      );
      if (catError) toast.error(catError.message);
    }
    invalidateWedding();
    qc.invalidateQueries({ queryKey: ["budget-categories", wedding.id] });
  };

  if (weddingLoading) {
    return <AppShell title="Budget"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  if (!wedding) {
    return <AppShell title="Budget"><p className="text-sm text-muted-foreground">Finish onboarding first.</p></AppShell>;
  }

  if (!wedding.budget_setup_completed) {
    return (
      <AppShell title="Budget" subtitle="A quick setup, then you're tracking.">
        <BudgetOnboarding onComplete={completeOnboarding} />
      </AppShell>
    );
  }

  const loading = eventsLoading || expensesLoading || categoriesLoading || customColumnsLoading;

  // Exports always cover every expense on the wedding, ignoring active filters.
  const exportInput = () => ({
    weddingLabel: wedding.slug || wedding.id,
    currency, totalSpent, budgetLimit: limit, categoryTotals, expenses, customColumns,
  });

  return (
    <AppShell
      title="Budget"
      subtitle="Track what you're spending, and set a limit if you want to keep an eye on it."
      actions={
        <div className="flex items-center gap-2">
          <ExportMenu
            onExportExcel={() => exportBudgetExcel(exportInput())}
            onExportPdf={() => exportBudgetPdf(exportInput())}
          />
          <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
      <>
      {/* Summary: total spent full-width on top, two independently-configurable
          breakdown widgets below it */}
      <div className="paper-card p-3 md:p-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-cherry">Total spent</p>
            <p className="mt-0.5 font-sans font-semibold tabular-nums text-2xl">{money(totalSpent)}</p>
            {pct !== null && (
              <p className={cn("mt-1 text-sm font-medium", overBudget ? "text-destructive" : "text-sage-deep")}>
                {overBudget ? `${pct - 100}% over budget` : `${pct}% of budget used`}
              </p>
            )}
            {overBudget && <p className="mt-0.5 text-sm text-destructive">You have exceeded your budget.</p>}
          </div>

          {/* The gap between the two numbers doubles as a spent-vs-limit rail: fill
              tracks progress toward the limit (capped visually at 100%, since a
              literal 260%-long bar isn't legible), with a $ marker riding the front
              edge — so the empty space reads as "how much runway is left," not just
              whitespace. */}
          {pct !== null && limit != null && (
            <div className="hidden sm:block flex-1 min-w-[64px] self-center px-2">
              <div className="relative h-1.5 rounded-full bg-line">
                <div className={cn("h-full rounded-full transition-all", overBudget ? "bg-destructive" : "bg-sage-deep")}
                  style={{ width: `${Math.min(100, pct)}%` }} />
                <div className={cn("absolute top-1/2 grid h-6 w-6 -translate-y-1/2 -translate-x-1/2 place-items-center rounded-full text-pearl ring-2 ring-paper shadow-sm transition-all", overBudget ? "bg-destructive" : "bg-sage-deep")}
                  style={{ left: `${Math.min(100, pct)}%` }} title={`${pct}% of budget`}>
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          )}

          <div className="text-right">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Budget limit</p>
            <div className="mt-0.5 flex items-center justify-end gap-1.5">
              <CurrencyPrefixButton value={currency} onChange={changeCurrency} triggerClassName="text-base font-semibold py-0.5 pl-0 pr-1" />
              {editingLimit ? (
                <>
                  <input autoFocus type="text" inputMode="decimal" value={limitDraft}
                    onChange={(e) => reformatKeepingCaret(e, currency, setLimitDraft)}
                    onKeyDown={(e) => e.key === "Enter" && saveLimit()}
                    placeholder="No limit set"
                    className="w-56 rounded-full border border-line bg-pearl px-4 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
                  <button onClick={saveLimit} className="rounded-full bg-ink text-paper p-1.5 hover:bg-clay cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { setEditingLimit(false); setLimitDraft(wedding.budget_limit != null ? formatAmountInput(String(wedding.budget_limit), currency) : ""); }}
                    className="rounded-full border border-line p-1.5 hover:bg-stone cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </>
              ) : (
                <div className="relative inline-block group">
                  <button onClick={() => { setLimitDraft(limit != null ? formatAmountInput(String(limit), currency) : ""); setEditingLimit(true); }} data-static
                    className="font-sans font-semibold tabular-nums text-base group-hover:text-cherry cursor-pointer">
                    {limit != null ? formatAmountDisplay(limit, currency) : <span className="text-muted-foreground text-sm font-normal">Set a limit</span>}
                  </button>
                  <Pencil className="absolute -right-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6 items-stretch">
        <ExpenseBreakdownWidget expenses={expenses} events={events} categories={categories} money={money} defaultDimension="category" />
        <ExpenseBreakdownWidget expenses={expenses} events={events} categories={categories} money={money} defaultDimension="paid_by" />
      </div>

      {expenses.length === 0 ? (
        <>
          {/* Category summary boxes */}
          {categoryTotals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {categoryTotals.map(([cat, total]) => (
                <div key={cat} className="rounded-lg border border-line/60 bg-paper px-4 py-2.5">
                  <p className="text-[8px] uppercase tracking-widest text-muted-foreground">{cat}</p>
                  <p className="font-sans font-semibold tabular-nums text-base">{money(total)}</p>
                </div>
              ))}
            </div>
          )}
          <section className="warm-wash rounded-[40px] border border-line/60 px-6 md:px-12 py-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-cherry">Your budget</p>
            <h3 className="mt-2 font-serif text-2xl md:text-4xl leading-tight">Log your first expense</h3>
            <p className="mt-3 text-sm text-ink leading-relaxed">Track vendor deposits, décor, catering, whatever you're paying for, and optionally tag it to a specific event.</p>
          </section>
        </>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            {/* Category summary boxes — first in the left column so this row's top edge
                sets the grid row's top, which the aside beside it aligns to. */}
            <div className="space-y-2.5 mb-6">
              {categoryTotals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categoryTotals.map(([cat, total]) => (
                    <div key={cat} className="rounded-lg border border-line/60 bg-paper px-4 py-2.5">
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground">{cat}</p>
                      <p className="font-sans font-semibold tabular-nums text-base">{money(total)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <FilterChip label="Category" value={filterCategory} onChange={setFilterCategory}
                  options={categoryTotals.map(([c]) => ({ value: c, label: c }))} />
                <FilterChip label="Paid by" value={filterPaidBy} onChange={setFilterPaidBy} options={paidByOptions} />
                <FilterChip label="Event" value={filterEvent} onChange={setFilterEvent}
                  options={events.map((e) => ({ value: e.id, label: e.name }))} />
                <FilterChip label="Status" value={filterStatus} onChange={setFilterStatus}
                  options={[{ value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }]} />
                {customColumns.map((col) => (
                  <FilterChip key={col.id} label={col.name} value={customFilters[col.id] ?? ""}
                    onChange={(v) => setCustomFilters((prev) => ({ ...prev, [col.id]: v }))}
                    options={customColumnOptions[col.id] ?? []} />
                ))}
                {anyFilter && <button onClick={clearFilters} className="text-xs text-clay hover:underline cursor-pointer">Clear filters ×</button>}
                <span className="w-px self-stretch bg-line shrink-0" />
                <ColumnsPicker value={visibleCols} onChange={setVisibleCols} />
              </div>
              <p className="text-xs text-muted-foreground">{filteredExpenses.length} of {expenses.length} expense{expenses.length === 1 ? "" : "s"}</p>
            </div>

            <div className="space-y-1.5">
              {filteredExpenses.map((exp) => (
                <ExpenseRow key={exp.id} expense={exp} events={events} visibleCols={visibleCols}
                  customColumns={customColumns} currency={currency} money={money}
                  onToggleStatus={() => toggleStatus(exp)} onDelete={() => deleteExpense(exp.id)}
                  onEdit={() => setEditingExpense(exp)} onEditReminder={() => setReminderExpense(exp)}
                  onUpdateField={(patch) => updateExpenseField(exp.id, patch)} />
              ))}
            </div>
          </section>
          <aside className="paper-card p-4 h-fit lg:sticky lg:top-6">
            <AddExpenseForm events={events} categories={categories} customColumns={customColumns} currency={currency} onCreateCategory={createCategory} onAdd={addExpense} />
          </aside>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="paper-card p-4 mt-6 max-w-md">
          <AddExpenseForm events={events} categories={categories} customColumns={customColumns} currency={currency} onCreateCategory={createCategory} onAdd={addExpense} />
        </div>
      )}
      </>
      )}

      {settingsOpen && (
        <BudgetSettingsDialog wedding={wedding} categories={categories} customColumns={customColumns} events={events} onClose={() => setSettingsOpen(false)} />
      )}

      {reminderExpense && (
        <ReminderDialog expense={reminderExpense}
          onSave={(patch) => { updateExpenseField(reminderExpense.id, patch); setReminderExpense(null); }}
          onClose={() => setReminderExpense(null)} />
      )}

      {editingExpense && (
        <EditExpenseDialog expense={editingExpense} events={events} categories={categories} customColumns={customColumns} currency={currency}
          onCreateCategory={createCategory}
          onSave={(patch) => { updateExpenseField(editingExpense.id, normalizeExpenseForm(patch) as any); setEditingExpense(null); }}
          onClose={() => setEditingExpense(null)} />
      )}
    </AppShell>
  );
}

// Free-text, since who paid varies per couple — clicking the pill swaps it for an
// input right in place, same footprint, so the row doesn't jump around.
function EditablePaidByBadge({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Wrapped the same way as the other editable badges (event/payment/date) —
  // a bare <button> as the direct flex child sat at a different cross-axis
  // height than its div-wrapped siblings under the row's `items-center`,
  // throwing this one badge's vertical alignment off from the rest.
  if (editing) {
    const commit = () => {
      setEditing(false);
      const trimmed = draft.trim();
      if (trimmed !== value) onSave(trimmed);
    };
    return (
      <div className="relative inline-flex shrink-0">
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          placeholder="Paid by"
          className="text-[8px] uppercase tracking-widest rounded-full bg-blush-soft px-2 py-0.5 text-ink w-28 focus:outline-none focus:ring-1 focus:ring-clay" />
      </div>
    );
  }
  return (
    <div className="relative inline-flex shrink-0">
      <button type="button" onClick={() => { setDraft(value); setEditing(true); }} data-static
        className="text-[8px] uppercase tracking-widest rounded-full bg-blush-soft px-2 py-0.5 text-ink hover:bg-blush-soft-hover cursor-pointer whitespace-nowrap">
        {value ? `Paid by ${value}` : "Paid by"}
      </button>
    </div>
  );
}

function EditablePaymentMethodBadge({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} data-static
        className="text-[8px] uppercase tracking-widest rounded-full bg-wine-soft px-2 py-0.5 text-ink hover:bg-wine-soft-hover cursor-pointer whitespace-nowrap">
        {value || "Payment method"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[150px] rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <button type="button" key={o.value} onClick={() => { onSave(o.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", value === o.value && "font-medium")}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// One badge covers whichever date is relevant to the expense's current status —
// "Due" for pending, "paid on" for paid — same as AddExpenseForm's single field,
// so there's never a second stale date sitting next to it.
function EditableDateBadge({ value, isDue, onSave }: { value: string | null; isDue: boolean; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value + "T00:00:00") : undefined;
  const toneClass = isDue ? "bg-destructive/10 text-destructive hover:bg-destructive/15" : "bg-cream text-ink hover:bg-cream-hover";
  const label = date ? format(date, "MMM d") : (isDue ? "Set due date" : "Set paid date");

  return (
    <div className="relative inline-flex shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} data-static
        className={cn("text-[8px] uppercase tracking-widest rounded-full px-2 py-0.5 cursor-pointer whitespace-nowrap", toneClass)}>
        {isDue && date ? `Due ${label}` : label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 rounded-2xl border border-line bg-paper shadow-lg">
            <Calendar mode="single" selected={date} initialFocus
              onSelect={(d) => { onSave(d ? format(d, "yyyy-MM-dd") : ""); setOpen(false); }}
              className="p-3 pointer-events-auto" />
          </div>
        </>
      )}
    </div>
  );
}

function EditableEventBadge({ value, events, onSave }: { value: string; events: { id: string; name: string }[]; onSave: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = events.find((e) => e.id === value)?.name ?? "No event";
  return (
    <div className="relative inline-flex shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} data-static
        className="text-[8px] uppercase tracking-widest rounded-full bg-sage-soft px-2 py-0.5 text-ink hover:bg-sage-soft-hover cursor-pointer whitespace-nowrap">
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button type="button" onClick={() => { onSave(""); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", !value && "font-medium")}>
              No event
            </button>
            {events.map((e) => (
              <button type="button" key={e.id} onClick={() => { onSave(e.id); setOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", value === e.id && "font-medium")}>
                {e.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Same hover-reveal-pencil affordance as the overall budget limit — the number
// itself is the click target, and swaps for a live-formatted input in place.
function EditableAmountBadge({ amount, currency, money, onSave }: {
  amount: number; currency: string; money: (n: number) => string; onSave: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formatAmountInput(String(amount), currency));

  if (editing) {
    const commit = () => {
      setEditing(false);
      const n = Math.max(0, Math.round(parseAmountInput(draft)));
      if (n !== amount) onSave(n);
    };
    return (
      <input autoFocus inputMode="decimal" value={draft}
        onChange={(e) => reformatKeepingCaret(e, currency, setDraft)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(formatAmountInput(String(amount), currency)); setEditing(false); } }}
        className="w-28 shrink-0 rounded-full border border-line bg-pearl px-2.5 py-1 text-right text-sm font-sans font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
    );
  }
  return (
    <button type="button" onClick={() => { setDraft(formatAmountInput(String(amount), currency)); setEditing(true); }} data-static
      className="group inline-flex items-center justify-end gap-1.5 shrink-0 min-w-[90px] font-sans font-semibold tabular-nums text-sm hover:text-cherry cursor-pointer">
      {money(amount)}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function ExpenseRow({ expense, events, customColumns, currency, money, visibleCols, onToggleStatus, onDelete, onEdit, onEditReminder, onUpdateField }: {
  expense: Expense; events: { id: string; name: string }[]; customColumns: BudgetCustomColumn[]; currency: string; money: (n: number) => string;
  visibleCols: VisibleCols;
  onToggleStatus: () => void; onDelete: () => void; onEdit: () => void; onEditReminder: () => void;
  onUpdateField: (patch: Partial<Pick<Expense, "amount" | "event_id" | "paid_by" | "payment_method" | "paid_date" | "due_date">>) => void;
}) {
  const paid = expense.status === "paid";
  const customBadges = customColumns
    .map((col) => ({ col, display: customFieldDisplay(col, (expense.custom_fields as Record<string, unknown>)?.[col.id]) }))
    .filter((c) => c.display !== null);

  return (
    <div className="bg-paper rounded-md px-4 py-2.5 flex items-center gap-3 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.06),0_1px_2px_rgb(0_0_0_/_0.03)]">
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
        <p className="text-sm font-medium text-ink shrink-0">{expense.name}</p>
        {visibleCols.description && expense.description && <span className="text-sm text-muted-foreground truncate">{expense.description}</span>}
        {visibleCols.category && expense.category && <span className="text-[8px] uppercase tracking-widest rounded-full bg-stone px-2 py-0.5 text-muted-foreground shrink-0">{expense.category}</span>}
        {visibleCols.event && <EditableEventBadge value={expense.event_id ?? ""} events={events} onSave={(v) => onUpdateField({ event_id: v || null })} />}
        {visibleCols.paidBy && <EditablePaidByBadge value={expense.paid_by ?? ""} onSave={(v) => onUpdateField({ paid_by: v || null })} />}
        <EditablePaymentMethodBadge value={expense.payment_method ?? ""} onSave={(v) => onUpdateField({ payment_method: v || null })} />
        <EditableDateBadge value={paid ? expense.paid_date : expense.due_date} isDue={!paid}
          onSave={(v) => onUpdateField(paid ? { paid_date: v || null } : { due_date: v || null })} />
        {customBadges.map(({ col, display }) => (
          <span key={col.id} className="text-[8px] uppercase tracking-widest rounded-full bg-stone px-2 py-0.5 text-muted-foreground shrink-0">{col.name}: {display}</span>
        ))}
      </div>
      <EditableAmountBadge amount={expense.amount} currency={currency} money={money} onSave={(n) => onUpdateField({ amount: n })} />
      {/* A fixed-width slot, so amounts stay lined up whether or not a row has a reminder. */}
      <span className="flex w-5 shrink-0 justify-center">
        {expense.reminder_at && !paid && (
          <button type="button" onClick={onEditReminder} data-reminder={expense.reminder_sent_at ? "sent" : "scheduled"}
            aria-label="Edit payment reminder" className="cursor-pointer rounded-full p-0.5 hover:bg-stone"
            title={expense.reminder_sent_at
              ? "Payment reminder sent. Click to change it"
              : `Reminder: ${new Date(expense.reminder_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${expense.reminder_include_collaborators ? " (collaborators included)" : ""}. Click to change it`}>
            <Bell className={cn("h-4 w-4", expense.reminder_sent_at ? "text-muted-foreground" : "text-ink")} />
          </button>
        )}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {visibleCols.status && (
          <button onClick={onToggleStatus}
            className={cn(
              "w-[72px] text-center text-[8px] uppercase tracking-widest rounded-full px-3 py-1.5 transition-colors cursor-pointer",
              paid ? "bg-sage-deep text-pearl hover:bg-sage-deep-hover" : "bg-destructive/10 text-destructive hover:bg-destructive/15",
            )}>
            {paid ? "Paid" : "Pending"}
          </button>
        )}
        <button onClick={onEdit} className="text-muted-foreground hover:text-ink p-1 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-cherry p-1 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

type ExpenseFormValues = {
  name: string; amount: number; description: string; category: string; status: "pending" | "paid";
  event_id: string; paid_by: string; payment_method: string; paid_date: string; due_date: string; custom_fields: Record<string, unknown>;
  // undefined = leave the reminder as it is, a timestamp = (re)schedule it, null = remove it.
  reminder_at?: string | null;
  // undefined = leave as it is.
  reminder_include_collaborators?: boolean;
};

// Date helpers for the reminder's default send date (the day before the due date, but never in the past).
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function defaultReminderDate(due: string): string {
  const d = new Date(`${due}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const today = toYmd(new Date());
  const ymd = toYmd(d);
  return ymd < today ? today : ymd;
}
const DEFAULT_REMINDER_TIME = "08:30";

// Shared by the "Add expense" sidebar card and the "Edit expense" modal —
// same fields either way, just seeded from an existing expense (and with a
// different submit label/icon) when editing instead of creating.
function ExpenseForm({ events, categories, customColumns, currency, onCreateCategory, initial, title = "Add expense", submitLabel = "Add expense", submitIcon: SubmitIcon = Plus, onSubmit }: {
  events: { id: string; name: string }[];
  categories: BudgetCategory[];
  customColumns: BudgetCustomColumn[];
  currency: string;
  onCreateCategory: (name: string) => Promise<void>;
  initial?: Partial<Expense>;
  title?: string;
  submitLabel?: string;
  submitIcon?: typeof Plus;
  onSubmit: (form: ExpenseFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount != null ? formatAmountInput(String(initial.amount), currency) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [status, setStatus] = useState<"pending" | "paid">(initial?.status === "paid" ? "paid" : "pending");
  const [eventId, setEventId] = useState(initial?.event_id ?? "");
  const [paidBy, setPaidBy] = useState(initial?.paid_by ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? "Card");
  // One field, meaning "when it's due" or "when it was paid" depending on status —
  // an expense is either owed or settled, never both, so there's never a reason to
  // fill in the other one too.
  const [dateValue, setDateValue] = useState((initial?.status === "paid" ? initial?.paid_date : initial?.due_date) ?? "");
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const seeded: Record<string, string> = {};
    const cf = (initial?.custom_fields as Record<string, unknown>) ?? {};
    customColumns.forEach((col) => { if (cf[col.id] != null && cf[col.id] !== "") seeded[col.id] = String(cf[col.id]); });
    return seeded;
  });

  // Payment reminder: an email to the account's address at a chosen date and time. Offered whenever a
  // pending expense has a "due by" date; on by default for a new expense.
  const initialReminder = initial?.reminder_at ? new Date(initial.reminder_at) : null;
  const [reminderOn, setReminderOn] = useState(initial ? !!initialReminder : true);
  const [reminderDate, setReminderDate] = useState(initialReminder ? toYmd(initialReminder) : "");
  const [reminderTime, setReminderTime] = useState(initialReminder ? `${String(initialReminder.getHours()).padStart(2, "0")}:${String(initialReminder.getMinutes()).padStart(2, "0")}` : DEFAULT_REMINDER_TIME);
  const [reminderTouched, setReminderTouched] = useState(!!initialReminder);
  const [includeCollaborators, setIncludeCollaborators] = useState(!!initial?.reminder_include_collaborators);
  const [accountEmail, setAccountEmail] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAccountEmail(data.user?.email ?? "")); }, []);
  const reminderAvailable = status === "pending" && !!dateValue;
  const onDueChange = (v: string) => {
    setDateValue(v);
    if (v && !reminderTouched) setReminderDate(defaultReminderDate(v));
  };
  const effectiveReminderDate = reminderDate || (dateValue ? defaultReminderDate(dateValue) : "");

  const evaluated = evalMathExpr(amount);

  const onAmountBlur = () => {
    if (evaluated != null) setAmount(formatAmountInput(String(Math.round(evaluated)), currency));
  };

  // Math expressions ("500+200") type through untouched — comma-grouping a partial
  // expression doesn't make sense until it resolves to one number on blur — but a
  // plain number gets grouped live as you type.
  const onAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/[+\-*/]/.test(e.target.value)) setAmount(e.target.value);
    else reformatKeepingCaret(e, currency, setAmount);
  };

  const setCustomValue = (id: string, v: string) => setCustomValues((prev) => ({ ...prev, [id]: v }));

  const submit = () => {
    if (!name.trim() || evaluated == null) return;
    const custom_fields: Record<string, unknown> = {};
    customColumns.forEach((col) => {
      const raw = customValues[col.id];
      if (raw === undefined || raw === "") return;
      custom_fields[col.id] = col.type === "number" ? Number(raw) : col.type === "boolean" ? raw === "true" : raw;
    });
    let reminder_at: string | null | undefined;
    if (reminderAvailable && reminderOn && effectiveReminderDate) {
      const iso = new Date(`${effectiveReminderDate}T${reminderTime}:00`).toISOString();
      reminder_at = iso === initial?.reminder_at ? undefined : iso;
    } else if (initial?.reminder_at) {
      reminder_at = null;
    }
    // Written only when it matters, so saving an expense never depends on the new column unless it is used.
    const reminderStays = reminderAvailable && reminderOn && !!effectiveReminderDate;
    const wasOn = !!initial?.reminder_include_collaborators;
    const reminder_include_collaborators: boolean | undefined =
      reminderStays ? (includeCollaborators || wasOn ? includeCollaborators : undefined) : (wasOn ? false : undefined);
    onSubmit({
      name, amount: evaluated, description, category, status, event_id: eventId, paid_by: paidBy, payment_method: paymentMethod,
      paid_date: status === "paid" ? dateValue : "", due_date: status === "pending" ? dateValue : "", custom_fields, reminder_at,
      reminder_include_collaborators,
    });
    if (!initial) {
      setName(""); setAmount(""); setDescription(""); setCategory(""); setStatus("pending");
      setEventId(""); setPaidBy(""); setPaymentMethod("Card"); setDateValue(""); setCustomValues({});
      setReminderOn(true); setReminderDate(""); setReminderTime(DEFAULT_REMINDER_TIME); setReminderTouched(false); setIncludeCollaborators(false);
    }
  };

  return (
    <div>
      {title && <h3 className="font-sans text-sm font-semibold">{title}</h3>}
      <div className="mt-3 space-y-2">
        <input placeholder="Expense name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-clay" />
        <div className="relative">
          <input placeholder="500 or 500+200" inputMode="decimal" value={amount} onChange={onAmountChange} onBlur={onAmountBlur}
            className="w-full rounded-xl border border-line bg-pearl px-3 py-2 pr-12 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{currency}</span>
        </div>
        <textarea placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-clay resize-none" />
        <CategoryDropdown value={category} onChange={setCategory} categories={categories} onCreate={onCreateCategory} />
        <Dropdown size="sm" value={eventId} onChange={setEventId} placeholder="No specific event"
          options={[{ value: "", label: "No specific event" }, ...events.map((e) => ({ value: e.id, label: e.name }))]} />

        <div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Paid by</span>
          <input value={paidBy} onChange={(e) => setPaidBy(e.target.value)} placeholder="Paid by"
            className="mt-1 w-full rounded-xl border border-line bg-pearl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>

        <div className="flex gap-1.5">
          <button type="button" onClick={() => setStatus("pending")}
            className={cn("flex-1 rounded-xl border py-1.5 text-xs transition-colors focus:outline-none", status === "pending" ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
            Pending
          </button>
          <button type="button" onClick={() => setStatus("paid")}
            className={cn("flex-1 rounded-xl border py-1.5 text-xs transition-colors focus:outline-none", status === "paid" ? "bg-sage-deep text-pearl border-sage-deep" : "border-line text-muted-foreground hover:bg-stone")}>
            Paid
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Dropdown size="sm" value={paymentMethod} onChange={setPaymentMethod} placeholder="Payment method" options={PAYMENT_METHOD_OPTIONS} />
          <DatePicker value={dateValue} onChange={onDueChange} placeholder={status === "pending" ? "Due by" : "Paid date"} displayFormat="MMM d"
            className="px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
        </div>

        {reminderAvailable && (
          <div className="rounded-xl border border-line bg-pearl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <button type="button" role="switch" aria-checked={reminderOn} onClick={() => setReminderOn((v) => !v)} className="flex items-center gap-2 text-xs text-left">
                <span className={cn("relative h-4 w-7 shrink-0 rounded-full transition-colors", reminderOn ? "bg-cherry" : "bg-line")}>
                  <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-paper transition-all", reminderOn ? "left-3.5" : "left-0.5")} />
                </span>
                Set a payment reminder
              </button>
              <span className="rounded-md bg-ink px-1.5 py-0.5 text-[9px] text-paper">Recommended</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Never miss a beat. We'll email {accountEmail ? <span className="text-ink">{accountEmail}</span> : "you"} when it's time to pay.
            </p>
            {reminderOn && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={includeCollaborators} onChange={(e) => setIncludeCollaborators(e.target.checked)} className="h-3.5 w-3.5 accent-[#243746]" />
                Include collaborators
              </label>
            )}
            {reminderOn && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Send date</span>
                  <DatePicker value={effectiveReminderDate} onChange={(v) => { setReminderDate(v); setReminderTouched(true); }} placeholder="Send date" displayFormat="MMM d"
                    className="mt-1 px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Send time</span>
                  <TimePicker value={reminderTime} onChange={(v) => { setReminderTime(v); setReminderTouched(true); }}
                    className="mt-1 rounded-xl bg-pearl px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
                </div>
              </div>
            )}
          </div>
        )}

        {customColumns.map((col) => (
          <div key={col.id}>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{col.name}</span>
            <div className="mt-1">
              {col.type === "text" && (
                <input value={customValues[col.id] ?? ""} onChange={(e) => setCustomValue(col.id, e.target.value)}
                  className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-clay" />
              )}
              {col.type === "number" && (
                <input type="number" value={customValues[col.id] ?? ""} onChange={(e) => setCustomValue(col.id, e.target.value)}
                  className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-clay" />
              )}
              {col.type === "date" && (
                <DatePicker value={customValues[col.id] ?? ""} onChange={(v) => setCustomValue(col.id, v)} placeholder="Pick a date" displayFormat="MMM d"
                  className="px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
              )}
              {col.type === "boolean" && (
                <div className="flex gap-1.5">
                  {[["true", "Yes"], ["false", "No"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setCustomValue(col.id, customValues[col.id] === v ? "" : v)}
                      className={cn("flex-1 rounded-xl border py-1.5 text-xs transition-colors cursor-pointer focus:outline-none", customValues[col.id] === v ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <button onClick={submit} disabled={!name.trim() || evaluated == null}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-cherry text-paper py-2 text-xs hover:bg-ink disabled:opacity-60 cursor-pointer">
          <SubmitIcon className="h-4 w-4" /> {submitLabel}
        </button>
      </div>
    </div>
  );
}

function AddExpenseForm({ onAdd, ...props }: {
  events: { id: string; name: string }[];
  categories: BudgetCategory[];
  customColumns: BudgetCustomColumn[];
  currency: string;
  onCreateCategory: (name: string) => Promise<void>;
  onAdd: (form: ExpenseFormValues) => void;
}) {
  return <ExpenseForm {...props} onSubmit={onAdd} />;
}

// Opened from the bell on an expense row: changes just the payment reminder (when it is sent, and whether
// collaborators get it too), or removes it.
function ReminderDialog({ expense, onSave, onClose }: {
  expense: Expense;
  onSave: (patch: { reminder_at: string | null; reminder_sent_at: null; reminder_include_collaborators?: boolean }) => void;
  onClose: () => void;
}) {
  const current = expense.reminder_at ? new Date(expense.reminder_at) : new Date();
  const [date, setDate] = useState(toYmd(current));
  const [time, setTime] = useState(`${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}`);
  const [include, setInclude] = useState(!!expense.reminder_include_collaborators);
  const wasInclude = !!expense.reminder_include_collaborators;

  const save = () => {
    if (!date) return;
    onSave({
      reminder_at: new Date(`${date}T${time}:00`).toISOString(), reminder_sent_at: null,
      // Only written when it matters, so this never depends on the column unless it is used.
      ...(include || wasInclude ? { reminder_include_collaborators: include } : {}),
    });
  };
  const remove = () => onSave({ reminder_at: null, reminder_sent_at: null, ...(wasInclude ? { reminder_include_collaborators: false } : {}) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Payment reminder" className="w-full max-w-sm rounded-3xl bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl">Payment reminder</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{expense.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer text-muted-foreground hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Send date</span>
            <DatePicker value={date} onChange={setDate} placeholder="Send date" displayFormat="MMM d" className="mt-1 px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Send time</span>
            <TimePicker value={time} onChange={setTime} className="mt-1 rounded-xl bg-pearl px-3 py-2 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs">
          <input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} className="h-3.5 w-3.5 accent-[#243746]" />
          Include collaborators
        </label>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={remove} className="cursor-pointer text-xs text-cherry underline underline-offset-4">Remove reminder</button>
          <button type="button" onClick={save} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-xs text-paper hover:bg-clay">
            <Check className="h-3.5 w-3.5" /> Save reminder
          </button>
        </div>
      </div>
    </div>
  );
}

function EditExpenseDialog({ expense, events, categories, customColumns, currency, onCreateCategory, onSave, onClose }: {
  expense: Expense;
  events: { id: string; name: string }[];
  categories: BudgetCategory[];
  customColumns: BudgetCustomColumn[];
  currency: string;
  onCreateCategory: (name: string) => Promise<void>;
  onSave: (form: ExpenseFormValues) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-md w-full p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-xl">Edit expense</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <ExpenseForm events={events} categories={categories} customColumns={customColumns} currency={currency}
          onCreateCategory={onCreateCategory} initial={expense} title="" submitLabel="Save changes" submitIcon={Check}
          onSubmit={onSave} />
      </div>
    </div>
  );
}

function BudgetOnboarding({ onComplete }: {
  onComplete: (patch: { budget_limit: number | null; budget_currency: string; categoryNames: string[] }) => Promise<void>;
}) {
  const [hasBudget, setHasBudget] = useState<null | boolean>(null);
  const [limit, setLimit] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [selected, setSelected] = useState<string[]>(DEFAULT_CATEGORIES);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (c: string) => setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const submit = async () => {
    setSaving(true);
    await onComplete({
      budget_limit: hasBudget && limit.trim() ? Math.max(0, Math.round(Number(limit))) : null,
      budget_currency: currency,
      categoryNames: selected,
    });
    setSaving(false);
  };

  const skip = async () => {
    setSaving(true);
    await onComplete({ budget_limit: null, budget_currency: "USD", categoryNames: [] });
    setSaving(false);
  };

  return (
    <div className="paper-card p-8 max-w-xl mx-auto">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper"><Wallet className="h-5 w-5" /></span>
      <h2 className="mt-4 font-serif text-2xl">Let's set up your budget</h2>
      <p className="mt-1 text-sm text-muted-foreground">Takes under a minute. Everything here can be changed later from Settings.</p>

      <div className="mt-6">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">Do you have a budget in mind?</span>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setHasBudget(true)}
            className={cn("flex-1 rounded-2xl border py-2.5 text-sm transition-colors cursor-pointer", hasBudget === true ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
            Yes
          </button>
          <button type="button" onClick={() => { setHasBudget(false); setLimit(""); }}
            className={cn("flex-1 rounded-2xl border py-2.5 text-sm transition-colors cursor-pointer", hasBudget === false ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
            No
          </button>
        </div>
        {hasBudget && (
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCIES[currency as CurrencyCode]?.symbol ?? "$"}</span>
            <input autoFocus type="text" inputMode="decimal" value={formatAmountInput(limit, currency)} onChange={(e) => setLimit(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Total budget"
              className="w-full rounded-2xl border border-line bg-pearl pl-8 pr-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
        )}
      </div>

      <div className="mt-6">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">What currency?</span>
        <Dropdown value={currency} onChange={setCurrency} placeholder="Currency" className="mt-2"
          options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.label} (${c.symbol})` }))} />
      </div>

      <div className="mt-6">
        <span className="text-sm uppercase tracking-widest text-muted-foreground">Select your categories</span>
        <p className="mt-1 text-sm text-muted-foreground">Pre-checked with common defaults, uncheck anything you don't need. Add more anytime.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((c) => {
            const on = selected.includes(c);
            return (
              <button key={c} type="button" onClick={() => toggleCategory(c)}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer", on ? "bg-sage-deep text-pearl border-sage-deep" : "bg-pearl text-ink border-line hover:bg-stone")}>
                {on && <Check className="h-3 w-3" />} {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={skip} disabled={saving} className="text-sm text-muted-foreground hover:text-ink underline cursor-pointer disabled:opacity-60">
          Skip for now
        </button>
        <button onClick={submit} disabled={saving || hasBudget === null}
          className="inline-flex items-center gap-2 rounded-full bg-rose-deep text-pearl px-6 py-2.5 text-sm hover:bg-rose-deep-hover disabled:opacity-60 cursor-pointer">
          {saving ? "Saving…" : "Start tracking"}
        </button>
      </div>
    </div>
  );
}

// A category's allocation is edited as either a % of the total budget or a plain
// amount — typing one immediately computes and fills in the other. Two local text
// states (not one canonical number) because "50" (%) and "50" (amount) look
// identical but mean very different things; keeping them separate avoids the input
// re-interpreting what's currently on screen every time the other field changes.
function AllocationRow({ allocatedAmount, limit, currency, money, onSave }: {
  allocatedAmount: number | null; limit: number; currency: string; money: (n: number) => string;
  onSave: (amount: number | null) => void;
}) {
  const toPct = (amount: number) => String(round2((amount / limit) * 100));
  const [amountStr, setAmountStr] = useState(allocatedAmount != null ? formatAmountInput(String(allocatedAmount), currency) : "");
  const [pctStr, setPctStr] = useState(allocatedAmount != null ? toPct(allocatedAmount) : "");

  const fromAmount = (raw: string) => {
    setAmountStr(formatAmountInput(raw, currency));
    const n = parseAmountInput(raw);
    setPctStr(raw.trim() === "" ? "" : toPct(n));
  };

  // Percent is a plain number, not grouped like a currency amount — but still
  // capped at 2 decimal places (e.g. 33.33), per how a percentage is normally written.
  const fromPct = (raw: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
    setPctStr(raw);
    const n = Number(raw);
    setAmountStr(raw.trim() === "" || !Number.isFinite(n) ? "" : formatAmountInput(String(Math.round((n / 100) * limit)), currency));
  };

  const commit = () => {
    const trimmed = amountStr.trim();
    const amount = trimmed === "" ? null : Math.max(0, Math.round(parseAmountInput(trimmed)));
    if (amount !== (allocatedAmount ?? null)) onSave(amount);
  };

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <div className="relative w-20">
        <input value={pctStr} onChange={(e) => fromPct(e.target.value)} onBlur={commit} placeholder="0" inputMode="decimal"
          className="w-full rounded-full border border-line bg-pearl pl-2.5 pr-5 py-1.5 text-[10px] text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
      </div>
      <span className="text-[10px] text-muted-foreground">=</span>
      <input value={amountStr} onChange={(e) => fromAmount(e.target.value)} onBlur={commit} placeholder={money(0)} inputMode="decimal"
        className="flex-1 min-w-0 rounded-full border border-line bg-pearl px-3 py-1.5 text-[10px] text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
    </div>
  );
}

function BudgetSettingsDialog({ wedding, categories, customColumns, events, onClose }: {
  wedding: { id: string; budget_currency: string; budget_limit: number | null; budget_allocation_mode: string };
  categories: BudgetCategory[];
  customColumns: BudgetCustomColumn[];
  events: Event[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [currency, setCurrency] = useState(wedding.budget_currency);
  const [limitStr, setLimitStr] = useState(wedding.budget_limit != null ? formatAmountInput(String(wedding.budget_limit), wedding.budget_currency) : "");
  const [mode, setMode] = useState(wedding.budget_allocation_mode);
  const [newCategory, setNewCategory] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<BudgetCustomColumn["type"]>("text");

  const invalidateCategories = () => qc.invalidateQueries({ queryKey: ["budget-categories", wedding.id] });
  const invalidateColumns = () => qc.invalidateQueries({ queryKey: ["budget-custom-columns", wedding.id] });

  const saveCurrency = async (code: string) => {
    setCurrency(code);
    const { error } = await supabase.from("weddings").update({ budget_currency: code }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["current-wedding"] });
  };

  const saveBudgetLimit = async () => {
    const trimmed = limitStr.trim();
    const n = trimmed === "" ? null : Math.max(0, Math.round(parseAmountInput(trimmed)));
    const { error } = await supabase.from("weddings").update({ budget_limit: n }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["current-wedding"] });
  };

  const saveAllocationMode = async (next: string) => {
    setMode(next);
    const { error } = await supabase.from("weddings").update({ budget_allocation_mode: next }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["current-wedding"] });
  };

  const saveEventAllocation = async (id: string, allocated_amount: number | null) => {
    const { error } = await supabase.from("events").update({ allocated_amount }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["events", wedding.id] });
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name || categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const { error } = await supabase.from("budget_categories").insert({ wedding_id: wedding.id, name, sort_order: categories.length });
    if (error) return toast.error(error.message);
    setNewCategory("");
    invalidateCategories();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("budget_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidateCategories();
  };

  const saveCategoryAllocation = async (id: string, allocated_amount: number | null) => {
    const { error } = await supabase.from("budget_categories").update({ allocated_amount }).eq("id", id);
    if (error) return toast.error(error.message);
    invalidateCategories();
  };

  const addColumn = async () => {
    const name = newColumnName.trim();
    if (!name) return;
    const { error } = await supabase.from("budget_custom_columns").insert({ wedding_id: wedding.id, name, type: newColumnType, sort_order: customColumns.length });
    if (error) return toast.error(error.message);
    setNewColumnName("");
    invalidateColumns();
  };

  const deleteColumn = async (id: string) => {
    const { error } = await supabase.from("budget_custom_columns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidateColumns();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-serif text-2xl">Budget settings</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Budget</span>
            <input value={limitStr} onChange={(e) => reformatKeepingCaret(e, currency, setLimitStr)} onBlur={saveBudgetLimit}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="No limit set" inputMode="decimal"
              className="mt-2 w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
          <div>
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Currency</span>
            <Dropdown value={currency} onChange={saveCurrency} placeholder="Currency" className="mt-2"
              options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.label} (${c.symbol})` }))} />
          </div>
        </div>

        <div className="mt-6">
          <span className="text-sm uppercase tracking-widest text-muted-foreground">Budget planning</span>
          <p className="mt-1 text-sm text-muted-foreground">Split your budget limit by category, or by event. Whichever matches how you think about spending.</p>
          <div className="mt-2 inline-flex rounded-full border border-line p-1">
            <button type="button" onClick={() => saveAllocationMode("category")}
              className={cn("rounded-full px-4 py-1.5 text-sm transition-colors cursor-pointer", mode === "category" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
              Budget by category
            </button>
            <button type="button" onClick={() => saveAllocationMode("event")}
              className={cn("rounded-full px-4 py-1.5 text-sm transition-colors cursor-pointer", mode === "event" ? "bg-ink text-paper" : "text-muted-foreground hover:text-ink")}>
              Budget by event
            </button>
          </div>
        </div>

        {mode === "category" ? (
          <div className="mt-6">
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Categories</span>
            {wedding.budget_limit == null ? (
              <p className="mt-1 text-sm text-muted-foreground">Set a total budget above to also give each category its own slice of it.</p>
            ) : (() => {
              const allocated = categories.reduce((sum, c) => sum + (c.allocated_amount ?? 0), 0);
              const overAllocated = allocated > wedding.budget_limit;
              return (
                <>
                  <p className={cn("mt-1 text-sm", overAllocated ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {formatMoney(allocated, currency)} of {formatMoney(wedding.budget_limit, currency)} allocated
                  </p>
                  {overAllocated && <p className="mt-0.5 text-sm text-destructive">You have exceeded your budget.</p>}
                </>
              );
            })()}
            <div className="mt-2 space-y-1.5">
              {categories.map((c) => (
                <div key={c.id} className="rounded-xl border border-line/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate">{c.name}</span>
                    <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {wedding.budget_limit != null && (
                    <AllocationRow allocatedAmount={c.allocated_amount} limit={wedding.budget_limit} currency={currency}
                      money={(n) => formatMoney(n, currency)} onSave={(amount) => saveCategoryAllocation(c.id, amount)} />
                  )}
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-muted-foreground italic">No categories yet.</p>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="New category" className="flex-1 rounded-2xl border border-line bg-pearl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              <button onClick={addCategory} className="rounded-full bg-ink text-paper p-2.5 hover:bg-clay cursor-pointer shrink-0"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Events</span>
            {wedding.budget_limit == null ? (
              <p className="mt-1 text-sm text-muted-foreground">Set a total budget above to also give each event its own slice of it.</p>
            ) : (() => {
              const allocated = events.reduce((sum, e) => sum + (e.allocated_amount ?? 0), 0);
              const overAllocated = allocated > wedding.budget_limit;
              return (
                <>
                  <p className={cn("mt-1 text-sm", overAllocated ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {formatMoney(allocated, currency)} of {formatMoney(wedding.budget_limit, currency)} allocated
                  </p>
                  {overAllocated && <p className="mt-0.5 text-sm text-destructive">You have exceeded your budget.</p>}
                </>
              );
            })()}
            <div className="mt-2 divide-y divide-line/60">
              {events.map((e) => (
                <div key={e.id} className="py-2.5 first:pt-0">
                  <span className="text-sm truncate block">{e.name}</span>
                  {wedding.budget_limit != null && (
                    <AllocationRow allocatedAmount={e.allocated_amount} limit={wedding.budget_limit} currency={currency}
                      money={(n) => formatMoney(n, currency)} onSave={(amount) => saveEventAllocation(e.id, amount)} />
                  )}
                </div>
              ))}
              {events.length === 0 && <p className="text-sm text-muted-foreground italic">No events yet. Add one from the Events page.</p>}
            </div>
          </div>
        )}

        <div className="mt-6">
          <span className="text-sm uppercase tracking-widest text-muted-foreground">Custom columns</span>
          <p className="mt-1 text-sm text-muted-foreground">Extra fields you can fill in per expense, and filter by.</p>
          <div className="mt-2 space-y-1.5">
            {customColumns.map((col) => (
              <div key={col.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/60 px-3 py-2">
                <span className="text-sm truncate">{col.name} <span className="text-[8px] uppercase tracking-widest text-muted-foreground">{CUSTOM_COLUMN_TYPES.find((t) => t.value === col.type)?.label}</span></span>
                <button onClick={() => deleteColumn(col.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {customColumns.length === 0 && <p className="text-sm text-muted-foreground italic">No custom columns yet.</p>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Column name"
              className="flex-1 rounded-2xl border border-line bg-pearl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            <Dropdown value={newColumnType} onChange={(v) => setNewColumnType(v as BudgetCustomColumn["type"])} placeholder="Type" className="w-32" options={CUSTOM_COLUMN_TYPES} />
            <button onClick={addColumn} className="rounded-full bg-ink text-paper p-2.5 hover:bg-clay cursor-pointer shrink-0"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button onClick={onClose} className="rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay cursor-pointer">Done</button>
        </div>
      </div>
    </div>
  );
}
