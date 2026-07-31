import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  useCurrentWedding, useEvents, useExpenses, useBudgetCategories, useBudgetCustomColumns,
  type Expense, type BudgetCategory, type BudgetCustomColumn,
} from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, Wallet, ChevronDown, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhotoEmptyState } from "@/components/photo-empty-state";
import { DatePicker } from "@/components/ui/datepicker";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/currency";
import { evalMathExpr } from "@/lib/math-expr";
import { Dropdown, type DropdownOption } from "@/components/dropdown";

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
      value={value} onChange={onChange} placeholder="Category"
      options={categories.map((c) => ({ value: c.name, label: c.name }))}
      footer={
        adding ? (
          <div className="flex items-center gap-1.5 p-1">
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="New category" onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-lg border border-line px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-clay bg-paper" />
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
          isSet ? "bg-clay text-paper border-clay" : "bg-paper text-ink/70 border-line hover:bg-stone",
        )}>
        {isSet ? active?.label ?? label : label} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 z-20 min-w-[170px] max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", !isSet && "font-medium")}>
              All {label.toLowerCase()}
            </button>
            {options.map((o) => (
              <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer", value === o.value && "font-medium")}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function customFieldDisplay(col: BudgetCustomColumn, raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (col.type === "boolean") return raw ? "Yes" : "No";
  if (col.type === "date" && typeof raw === "string") return new Date(raw + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return String(raw);
}

function BudgetPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: events = [], isLoading: eventsLoading } = useEvents(wedding?.id);
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(wedding?.id);
  const { data: categories = [], isLoading: categoriesLoading } = useBudgetCategories(wedding?.id);
  const { data: customColumns = [], isLoading: customColumnsLoading } = useBudgetCustomColumns(wedding?.id);
  const qc = useQueryClient();

  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState(wedding?.budget_limit != null ? String(wedding.budget_limit) : "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaidBy, setFilterPaidBy] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});

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
      if (filterPaidBy && e.paid_by !== filterPaidBy) return false;
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
    const n = trimmed === "" ? null : Math.max(0, Math.round(Number(trimmed)));
    const { error } = await supabase.from("weddings").update({ budget_limit: n }).eq("id", wedding.id);
    if (error) return toast.error(error.message);
    setEditingLimit(false);
    invalidateWedding();
  };

  const createCategory = async (name: string) => {
    if (!wedding) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const { error } = await supabase.from("budget_categories").insert({ wedding_id: wedding.id, name, sort_order: categories.length });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["budget-categories", wedding.id] });
  };

  const addExpense = async (form: {
    name: string; amount: number; description: string; category: string; status: "pending" | "paid";
    event_id: string; paid_by: string; payment_method: string; paid_date: string; custom_fields: Record<string, unknown>;
  }) => {
    if (!wedding) return;
    const { error } = await supabase.from("expenses").insert({
      wedding_id: wedding.id,
      name: form.name.trim(),
      amount: Math.max(0, Math.round(form.amount)),
      description: form.description.trim() || null,
      category: form.category || null,
      status: form.status,
      event_id: form.event_id || null,
      paid_by: form.paid_by || null,
      payment_method: form.payment_method.trim() || null,
      paid_date: form.paid_date || null,
      custom_fields: form.custom_fields as any,
    });
    if (error) return toast.error(error.message);
    invalidateExpenses();
    toast.success("Added");
  };

  const toggleStatus = async (exp: Expense) => {
    const next = exp.status === "paid" ? "pending" : "paid";
    const { error } = await supabase.from("expenses").update({ status: next }).eq("id", exp.id);
    if (error) return toast.error(error.message);
    invalidateExpenses();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
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

  return (
    <AppShell
      title="Budget"
      subtitle="Track what you're spending, and set a limit if you want to keep an eye on it."
      actions={
        <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone cursor-pointer">
          <Settings className="h-4 w-4" /> Settings
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
      <>
      {/* Summary */}
      <div className="paper-card p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-cherry">Total spent</p>
            <p className="mt-1 font-sans font-semibold tabular-nums text-4xl">{money(totalSpent)}</p>
            {pct !== null && (
              <p className={cn("mt-2 text-sm font-medium", overBudget ? "text-cherry" : "text-sage-deep")}>
                {overBudget ? `${pct - 100}% over budget` : `${pct}% of budget used`}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Budget limit</p>
            {editingLimit ? (
              <div className="mt-1 flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{CURRENCIES[currency as CurrencyCode]?.symbol ?? "$"}</span>
                  <input autoFocus type="number" min={0} value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveLimit()}
                    placeholder="No limit set"
                    className="w-36 rounded-full border border-line bg-pearl pl-8 pr-3 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
                </div>
                <button onClick={saveLimit} className="rounded-full bg-ink text-paper p-2 hover:bg-clay cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setEditingLimit(false); setLimitDraft(wedding.budget_limit != null ? String(wedding.budget_limit) : ""); }}
                  className="rounded-full border border-line p-2 hover:bg-stone cursor-pointer"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => setEditingLimit(true)} className="mt-1 inline-flex items-center gap-2 font-sans font-semibold tabular-nums text-2xl hover:text-cherry cursor-pointer">
                {limit != null ? money(limit) : <span className="text-muted-foreground text-base font-normal">Set a limit</span>}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {pct !== null && (
          <div className="mt-5 h-2.5 w-full rounded-full bg-stone overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", overBudget ? "bg-cherry" : "bg-sage-deep")}
              style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        )}
      </div>

      {/* Category summary boxes */}
      {categoryTotals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryTotals.map(([cat, total]) => (
            <div key={cat} className="rounded-2xl border border-line/60 bg-paper px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{cat}</p>
              <p className="font-sans font-semibold tabular-nums text-lg">{money(total)}</p>
            </div>
          ))}
        </div>
      )}

      {expenses.length === 0 ? (
        <PhotoEmptyState
          photo="garden"
          variant="landscape"
          eyebrow="Your budget"
          title="Log your first expense"
          body="Track vendor deposits, décor, catering, whatever you're paying for, and optionally tag it to a specific event."
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <FilterChip label="Category" value={filterCategory} onChange={setFilterCategory}
                options={categoryTotals.map(([c]) => ({ value: c, label: c }))} />
              <FilterChip label="Paid by" value={filterPaidBy} onChange={setFilterPaidBy} options={PAID_BY_OPTIONS} />
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
            </div>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} of {expenses.length} expense{expenses.length === 1 ? "" : "s"}</p>

            {filteredExpenses.map((exp) => (
              <ExpenseRow key={exp.id} expense={exp} eventName={events.find((e) => e.id === exp.event_id)?.name}
                customColumns={customColumns} money={money}
                onToggleStatus={() => toggleStatus(exp)} onDelete={() => deleteExpense(exp.id)} />
            ))}
          </section>
          <aside className="paper-card p-6 h-fit lg:sticky lg:top-6">
            <AddExpenseForm events={events} categories={categories} customColumns={customColumns} onCreateCategory={createCategory} onAdd={addExpense} />
          </aside>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="paper-card p-6 mt-6 max-w-md">
          <AddExpenseForm events={events} categories={categories} customColumns={customColumns} onCreateCategory={createCategory} onAdd={addExpense} />
        </div>
      )}
      </>
      )}

      {settingsOpen && (
        <BudgetSettingsDialog wedding={wedding} categories={categories} customColumns={customColumns} onClose={() => setSettingsOpen(false)} />
      )}
    </AppShell>
  );
}

function ExpenseRow({ expense, eventName, customColumns, money, onToggleStatus, onDelete }: {
  expense: Expense; eventName?: string; customColumns: BudgetCustomColumn[]; money: (n: number) => string;
  onToggleStatus: () => void; onDelete: () => void;
}) {
  const paid = expense.status === "paid";
  const paidByLabel = PAID_BY_OPTIONS.find((o) => o.value === expense.paid_by)?.label ?? expense.paid_by ?? undefined;
  const customBadges = customColumns
    .map((col) => ({ col, display: customFieldDisplay(col, (expense.custom_fields as Record<string, unknown>)?.[col.id]) }))
    .filter((c) => c.display !== null);

  return (
    <div className="bg-paper rounded-md p-4 flex items-start gap-3 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.06),0_1px_2px_rgb(0_0_0_/_0.03)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-soft text-clay mt-0.5"><Wallet className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink truncate">{expense.name}</p>
        {expense.description && <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{expense.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {expense.category && <span className="text-[10px] uppercase tracking-widest rounded-full bg-stone px-2 py-0.5 text-muted-foreground">{expense.category}</span>}
          {eventName && <span className="text-[10px] uppercase tracking-widest rounded-full bg-sage-soft px-2 py-0.5 text-ink/70">{eventName}</span>}
          {paidByLabel && <span className="text-[10px] uppercase tracking-widest rounded-full bg-blush-soft px-2 py-0.5 text-ink/70">Paid by {paidByLabel}</span>}
          {expense.payment_method && <span className="text-[10px] uppercase tracking-widest rounded-full bg-wine-soft px-2 py-0.5 text-ink/70">{expense.payment_method}</span>}
          {expense.paid_date && <span className="text-[10px] uppercase tracking-widest rounded-full bg-cream px-2 py-0.5 text-ink/70">{new Date(expense.paid_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
          {customBadges.map(({ col, display }) => (
            <span key={col.id} className="text-[10px] uppercase tracking-widest rounded-full bg-stone px-2 py-0.5 text-muted-foreground">{col.name}: {display}</span>
          ))}
        </div>
      </div>
      <span className="font-sans font-semibold tabular-nums text-lg shrink-0">{money(expense.amount)}</span>
      <button onClick={onToggleStatus}
        className={cn(
          "text-[10px] uppercase tracking-widest rounded-full px-3 py-1.5 shrink-0 transition-colors cursor-pointer",
          paid ? "bg-sage-deep text-pearl hover:bg-sage-deep-hover" : "bg-stone text-muted-foreground hover:bg-blush-soft",
        )}>
        {paid ? "Paid" : "Pending"}
      </button>
      <button onClick={onDelete} className="text-muted-foreground hover:text-cherry p-1 shrink-0 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function AddExpenseForm({ events, categories, customColumns, onCreateCategory, onAdd }: {
  events: { id: string; name: string }[];
  categories: BudgetCategory[];
  customColumns: BudgetCustomColumn[];
  onCreateCategory: (name: string) => Promise<void>;
  onAdd: (form: {
    name: string; amount: number; description: string; category: string; status: "pending" | "paid";
    event_id: string; paid_by: string; payment_method: string; paid_date: string; custom_fields: Record<string, unknown>;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const [eventId, setEventId] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [customPaidByOpen, setCustomPaidByOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [paidDate, setPaidDate] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const isCustomPaidBy = paidBy !== "" && !PAID_BY_OPTIONS.some((o) => o.value === paidBy);

  const evaluated = evalMathExpr(amount);

  const onAmountBlur = () => {
    if (evaluated != null && String(Math.round(evaluated)) !== amount) setAmount(String(Math.round(evaluated)));
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
    onAdd({ name, amount: evaluated, description, category, status, event_id: eventId, paid_by: paidBy, payment_method: paymentMethod, paid_date: paidDate, custom_fields });
    setName(""); setAmount(""); setDescription(""); setCategory(""); setStatus("pending");
    setEventId(""); setPaidBy(""); setCustomPaidByOpen(false); setPaymentMethod("Card"); setPaidDate(""); setCustomValues({});
  };

  return (
    <div>
      <h3 className="font-sans text-xl font-semibold">Add expense</h3>
      <div className="mt-4 space-y-3">
        <input placeholder="Expense name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        <div>
          <input placeholder="500 or 500+200" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={onAmountBlur}
            className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
          <p className="mt-1 text-[11px] text-muted-foreground">You can type simple math, e.g. "500+200" becomes 700.</p>
        </div>
        <textarea placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay resize-none" />
        <CategoryDropdown value={category} onChange={setCategory} categories={categories} onCreate={onCreateCategory} />
        <Dropdown value={eventId} onChange={setEventId} placeholder="No specific event"
          options={[{ value: "", label: "No specific event" }, ...events.map((e) => ({ value: e.id, label: e.name }))]} />

        <div>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Paid by</span>
          <div className="mt-1.5 flex gap-2">
            {PAID_BY_OPTIONS.map((o) => (
              <button key={o.value} type="button"
                onClick={() => { setCustomPaidByOpen(false); setPaidBy(paidBy === o.value ? "" : o.value); }}
                className={cn("flex-1 rounded-2xl border py-2 text-xs transition-colors cursor-pointer", paidBy === o.value ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
                {o.label}
              </button>
            ))}
            {customPaidByOpen || isCustomPaidBy ? (
              <input autoFocus value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                onBlur={() => { if (!paidBy.trim()) setCustomPaidByOpen(false); }}
                placeholder="Other…"
                className="flex-1 min-w-0 rounded-2xl border border-ink bg-pearl px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-clay" />
            ) : (
              <button type="button" onClick={() => { setPaidBy(""); setCustomPaidByOpen(true); }}
                className="flex-1 rounded-2xl border border-dashed border-line py-2 text-xs text-muted-foreground hover:bg-stone cursor-pointer">
                Other…
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Dropdown value={paymentMethod} onChange={setPaymentMethod} placeholder="Payment method" options={PAYMENT_METHOD_OPTIONS} />
          <DatePicker value={paidDate} onChange={setPaidDate} placeholder="Paid date" />
        </div>

        {customColumns.map((col) => (
          <div key={col.id}>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{col.name}</span>
            <div className="mt-1">
              {col.type === "text" && (
                <input value={customValues[col.id] ?? ""} onChange={(e) => setCustomValue(col.id, e.target.value)}
                  className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              )}
              {col.type === "number" && (
                <input type="number" value={customValues[col.id] ?? ""} onChange={(e) => setCustomValue(col.id, e.target.value)}
                  className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              )}
              {col.type === "date" && (
                <DatePicker value={customValues[col.id] ?? ""} onChange={(v) => setCustomValue(col.id, v)} placeholder="Pick a date" />
              )}
              {col.type === "boolean" && (
                <div className="flex gap-2">
                  {[["true", "Yes"], ["false", "No"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setCustomValue(col.id, customValues[col.id] === v ? "" : v)}
                      className={cn("flex-1 rounded-2xl border py-2 text-xs transition-colors cursor-pointer", customValues[col.id] === v ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <button type="button" onClick={() => setStatus("pending")}
            className={cn("flex-1 rounded-2xl border py-2.5 text-sm transition-colors", status === "pending" ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone")}>
            Pending
          </button>
          <button type="button" onClick={() => setStatus("paid")}
            className={cn("flex-1 rounded-2xl border py-2.5 text-sm transition-colors", status === "paid" ? "bg-sage-deep text-pearl border-sage-deep" : "border-line text-muted-foreground hover:bg-stone")}>
            Paid
          </button>
        </div>
        <button onClick={submit} disabled={!name.trim() || evaluated == null}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rose-deep text-pearl py-2.5 text-sm hover:bg-rose-deep-hover disabled:opacity-60 cursor-pointer">
          <Plus className="h-4 w-4" /> Add expense
        </button>
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
      <span className="grid h-12 w-12 place-items-center rounded-full bg-clay-soft text-clay"><Wallet className="h-5 w-5" /></span>
      <h2 className="mt-4 font-serif text-2xl">Let's set up your budget</h2>
      <p className="mt-1 text-sm text-muted-foreground">Takes under a minute. Everything here can be changed later from Settings.</p>

      <div className="mt-6">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Do you have a budget in mind?</span>
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
            <input autoFocus type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Total budget"
              className="w-full rounded-2xl border border-line bg-pearl pl-8 pr-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
        )}
      </div>

      <div className="mt-6">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">What currency?</span>
        <Dropdown value={currency} onChange={setCurrency} placeholder="Currency" className="mt-2"
          options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.label} (${c.symbol})` }))} />
      </div>

      <div className="mt-6">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Select your categories</span>
        <p className="mt-1 text-[11px] text-muted-foreground">Pre-checked with common defaults, uncheck anything you don't need. Add more anytime.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((c) => {
            const on = selected.includes(c);
            return (
              <button key={c} type="button" onClick={() => toggleCategory(c)}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer", on ? "bg-sage-deep text-pearl border-sage-deep" : "bg-pearl text-ink/70 border-line hover:bg-stone")}>
                {on && <Check className="h-3 w-3" />} {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={skip} disabled={saving} className="text-xs text-muted-foreground hover:text-ink underline cursor-pointer disabled:opacity-60">
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

function BudgetSettingsDialog({ wedding, categories, customColumns, onClose }: {
  wedding: { id: string; budget_currency: string };
  categories: BudgetCategory[];
  customColumns: BudgetCustomColumn[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [currency, setCurrency] = useState(wedding.budget_currency);
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

  const addColumn = async () => {
    const name = newColumnName.trim();
    if (!name) return;
    const { error } = await supabase.from("budget_custom_columns").insert({ wedding_id: wedding.id, name, type: newColumnType, sort_order: customColumns.length });
    if (error) return toast.error(error.message);
    setNewColumnName("");
    invalidateColumns();
  };

  const deleteColumn = async (id: string) => {
    if (!confirm("Delete this custom column? Its values on existing expenses will no longer be shown.")) return;
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

        <div className="mt-6">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Currency</span>
          <Dropdown value={currency} onChange={saveCurrency} placeholder="Currency" className="mt-2"
            options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.label} (${c.symbol})` }))} />
        </div>

        <div className="mt-6">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Categories</span>
          <div className="mt-2 space-y-1.5">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/60 px-3 py-2">
                <span className="text-sm truncate">{c.name}</span>
                <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-xs text-muted-foreground italic">No categories yet.</p>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category" className="flex-1 rounded-2xl border border-line bg-pearl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
            <button onClick={addCategory} className="rounded-full bg-ink text-paper p-2.5 hover:bg-clay cursor-pointer shrink-0"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        <div className="mt-6">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Custom columns</span>
          <p className="mt-1 text-[11px] text-muted-foreground">Extra fields you can fill in per expense, and filter by.</p>
          <div className="mt-2 space-y-1.5">
            {customColumns.map((col) => (
              <div key={col.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/60 px-3 py-2">
                <span className="text-sm truncate">{col.name} <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{CUSTOM_COLUMN_TYPES.find((t) => t.value === col.type)?.label}</span></span>
                <button onClick={() => deleteColumn(col.id)} className="text-muted-foreground hover:text-cherry cursor-pointer shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {customColumns.length === 0 && <p className="text-xs text-muted-foreground italic">No custom columns yet.</p>}
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
