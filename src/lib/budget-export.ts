import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "@/lib/currency";
import type { Expense, BudgetCustomColumn } from "@/lib/wedding-hooks";

const PAID_BY_LABELS: Record<string, string> = { bride: "Bride", groom: "Groom", both: "Both" };
const paidByLabel = (v: string | null) => (v ? PAID_BY_LABELS[v] ?? v : "");
const statusLabel = (s: string) => (s === "paid" ? "Paid" : "Pending");
const dateLabel = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

// Shared with the Budget page's own inline custom-field badges, so an export and the
// on-screen row always describe a value (e.g. a boolean or date custom column) the same way.
// Returns null (not "") when there's nothing to show, so callers can tell "no value" apart
// from a legitimately empty-looking display string.
export function customFieldDisplay(col: BudgetCustomColumn, raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (col.type === "boolean") return raw ? "Yes" : "No";
  if (col.type === "date" && typeof raw === "string") return dateLabel(raw);
  return String(raw);
}

const EXPENSE_HEADERS = ["Expense name", "Category", "Amount", "Paid by", "Payment method", "Status", "Paid date", "Description"];

function expenseRow(e: Expense, currency: string, customColumns: BudgetCustomColumn[]): (string | number)[] {
  return [
    e.name,
    e.category || "",
    formatMoney(e.amount, currency),
    paidByLabel(e.paid_by),
    e.payment_method || "",
    statusLabel(e.status),
    dateLabel(e.paid_date),
    e.description || "",
    ...customColumns.map((col) => customFieldDisplay(col, (e.custom_fields as Record<string, unknown> | null)?.[col.id]) ?? ""),
  ];
}

export type BudgetExportInput = {
  weddingLabel: string; // slug or id, used for the filename
  currency: string;
  totalSpent: number;
  budgetLimit: number | null;
  categoryTotals: [string, number][];
  expenses: Expense[];
  /** The couple's own custom columns (e.g. Vendor, Estimated) — each becomes an extra export column. */
  customColumns: BudgetCustomColumn[];
};

export function exportBudgetExcel(input: BudgetExportInput) {
  const { weddingLabel, currency, totalSpent, budgetLimit, categoryTotals, expenses, customColumns } = input;
  const headers = [...EXPENSE_HEADERS, ...customColumns.map((c) => c.name)];

  const rows: (string | number)[][] = [
    ["WedThread Budget Summary"],
    [],
    ["Total spent", formatMoney(totalSpent, currency)],
    ["Budget limit", budgetLimit != null ? formatMoney(budgetLimit, currency) : "No limit set"],
    [],
    ["Category breakdown"],
    ...categoryTotals.map(([cat, total]) => [cat, formatMoney(total, currency)]),
    [],
    [],
    ["Expenses"],
    headers,
    ...expenses.map((e) => expenseRow(e, currency, customColumns)),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 34 }, ...customColumns.map(() => ({ wch: 16 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Budget");
  XLSX.writeFile(wb, `wedthread-budget-${weddingLabel}.xlsx`);
}

export function exportBudgetPdf(input: BudgetExportInput) {
  const { weddingLabel, currency, totalSpent, budgetLimit, categoryTotals, expenses, customColumns } = input;
  const headers = [...EXPENSE_HEADERS, ...customColumns.map((c) => c.name)];
  const doc = new jsPDF();

  // Page 1: summary + category breakdown.
  doc.setFontSize(16);
  doc.text("Budget Summary", 14, 18);
  doc.setFontSize(10);
  doc.text(`Total spent: ${formatMoney(totalSpent, currency)}`, 14, 28);
  doc.text(`Budget limit: ${budgetLimit != null ? formatMoney(budgetLimit, currency) : "No limit set"}`, 14, 34);

  if (categoryTotals.length > 0) {
    autoTable(doc, {
      startY: 42,
      head: [["Category", "Total"]],
      body: categoryTotals.map(([cat, total]) => [cat, formatMoney(total, currency)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [138, 18, 38] },
      margin: { left: 14, right: 14 },
    });
  }

  // Page 2: full expense table — kept on its own page so layout never depends
  // on how tall the category table above happened to render.
  doc.addPage();
  doc.setFontSize(14);
  doc.text("Expenses", 14, 18);
  autoTable(doc, {
    startY: 24,
    head: [headers],
    body: expenses.map((e) => expenseRow(e, currency, customColumns)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [138, 18, 38] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`wedthread-budget-${weddingLabel}.pdf`);
}
