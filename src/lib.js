export const money = n => "Rs " + Math.round(Number(n || 0)).toLocaleString("en-US");

// Dates typed in a date field are stored at midnight UTC; show them as that same calendar day.
export function toLocalDay(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return d;
}
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const fmtDate = d => d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const toInputDate = d => {
  const x = d || new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

// A "Pending" invoice whose due date has passed is shown as "Overdue".
export function normalize(raw) {
  const date = toLocalDay(raw.date) || new Date();
  const dueDate = toLocalDay(raw.dueDate);
  const paidAt = toLocalDay(raw.paidAt);
  const rawStatus = raw.status || "Pending";
  const today = startOfToday();
  const overdue = rawStatus === "Pending" && dueDate && dueDate < today;
  return {
    id: raw.id,
    customer: raw.customer || "",
    customerEmail: raw.customerEmail || "",
    service: raw.service || "",
    amount: Number(raw.amount) || 0,
    date, dueDate, paidAt, rawStatus,
    status: overdue ? "Overdue" : rawStatus,
    daysLate: overdue ? Math.round((today - dueDate) / 864e5) : 0,
    method: raw.method || "Not recorded",
    notes: raw.notes || ""
  };
}

export const STATUSES = ["Paid", "Pending", "Overdue", "Cancelled"];
export const totalOf = (rows, status) => rows.filter(x => !status || x.status === status).reduce((a, x) => a + x.amount, 0);

export const RANGES = [
  ["month", "This month"], ["30d", "Last 30 days"], ["year", "This year"], ["all", "All data"]
];
export function dateInRange(d, range) {
  const now = new Date();
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === "year") return d.getFullYear() === now.getFullYear();
  if (range === "30d") return now - d <= 30 * 864e5 && d <= now;
  return true;
}
export const inRange = (row, range) => dateInRange(row.date, range);

// Money counts as income on the day it was received (paid date), falling back to the invoice date.
export const incomeDate = r => r.paidAt || r.date;
export const expenseDate = e => toLocalDay(e.date) || new Date();
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// One row per month of `year`: billed, income received, expenses, and profit (income - expenses).
export function monthlyReport(sales, expenses, year) {
  const rows = MONTHS.map((label, m) => ({ m, label, name: MONTHS_LONG[m], billed: 0, income: 0, expense: 0, invoices: 0, count: 0 }));
  sales.forEach(r => {
    if (r.status === "Cancelled") return;
    if (r.date.getFullYear() === year) { rows[r.date.getMonth()].billed += r.amount; rows[r.date.getMonth()].invoices++; }
    if (r.status === "Paid") { const d = incomeDate(r); if (d.getFullYear() === year) rows[d.getMonth()].income += r.amount; }
  });
  expenses.forEach(e => { const d = expenseDate(e); if (d.getFullYear() === year) { rows[d.getMonth()].expense += Number(e.amount) || 0; rows[d.getMonth()].count++; } });
  return rows.map(r => ({ ...r, profit: r.income - r.expense, margin: r.income > 0 ? ((r.income - r.expense) / r.income) * 100 : null, active: r.billed || r.income || r.expense }));
}

export function dueText(row) {
  if (row.status === "Paid" || row.status === "Cancelled") return "";
  if (!row.dueDate) return "No due date";
  if (row.daysLate > 0) return `${row.daysLate} day${row.daysLate > 1 ? "s" : ""} late`;
  const left = Math.round((row.dueDate - startOfToday()) / 864e5);
  return left === 0 ? "Due today" : `Due in ${left} day${left > 1 ? "s" : ""}`;
}

export function toCsv(rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Invoice", "Customer", "Email", "Service", "Issue date", "Due date", "Amount (PKR)", "Status", "Method", "Notes"];
  const body = rows.map(r => [r.id, r.customer, r.customerEmail, r.service, fmtDate(r.date), fmtDate(r.dueDate), r.amount, r.status, r.method, r.notes]);
  return [head, ...body].map(line => line.map(esc).join(",")).join("\n");
}
export function downloadText(name, text, type = "text/csv") {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
