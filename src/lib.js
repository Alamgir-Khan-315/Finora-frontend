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

// A "Pending" or "Partial" invoice whose due date has passed is shown as "Overdue".
export function normalize(raw) {
  const date = toLocalDay(raw.date) || new Date();
  const dueDate = toLocalDay(raw.dueDate);
  const paidAt = toLocalDay(raw.paidAt);
  const rawStatus = raw.status || "Pending";
  const today = startOfToday();
  const amount = Number(raw.amount) || 0;
  const payments = (raw.payments || []).map(p => ({ id: p.id, amount: Number(p.amount) || 0, date: toLocalDay(p.date) || date, method: p.method || "Cash", note: p.note || "" }))
    .sort((a, b) => a.date - b.date);
  const paidAmount = rawStatus === "Cancelled" ? payments.reduce((a, p) => a + p.amount, 0) : Math.min(amount, Number(raw.paidAmount) || payments.reduce((a, p) => a + p.amount, 0));
  const balance = Math.max(0, Math.round((amount - paidAmount) * 100) / 100);
  const overdue = (rawStatus === "Pending" || rawStatus === "Partial") && dueDate && dueDate < today;
  return {
    id: raw.id,
    customer: raw.customer || "",
    customerEmail: raw.customerEmail || "",
    customerPhone: raw.customerPhone || "",
    house: raw.house || "",
    address: raw.address || "",
    service: raw.service || "",
    amount, payments, paidAmount, balance,
    date, dueDate, paidAt, rawStatus,
    status: overdue ? "Overdue" : rawStatus,
    daysLate: overdue ? Math.round((today - dueDate) / 864e5) : 0,
    method: raw.method || "Not recorded",
    notes: raw.notes || ""
  };
}
export const siteOf = r => [r.house, r.address].filter(Boolean).join(", ");
// An invoice that still has money to collect.
export const isOpen = r => (r.status === "Pending" || r.status === "Partial" || r.status === "Overdue") && r.balance > 0;

export const STATUSES = ["Paid", "Partial", "Pending", "Overdue", "Cancelled"];
export const totalOf = (rows, status) => rows.filter(x => !status || x.status === status).reduce((a, x) => a + x.amount, 0);
// Every payment received (an invoice paid in parts has several), for income reports.
export const paymentEvents = rows => rows.filter(r => r.status !== "Cancelled").flatMap(r => r.payments.map(p => ({ date: p.date, amount: p.amount, invoice: r.id })));

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
  });
  paymentEvents(sales).forEach(p => { if (p.date.getFullYear() === year) rows[p.date.getMonth()].income += p.amount; });
  expenses.forEach(e => { const d = expenseDate(e); if (d.getFullYear() === year) { rows[d.getMonth()].expense += Number(e.amount) || 0; rows[d.getMonth()].count++; } });
  return rows.map(r => ({ ...r, profit: r.income - r.expense, margin: r.income > 0 ? ((r.income - r.expense) / r.income) * 100 : null, active: r.billed || r.income || r.expense }));
}

export function dueText(row) {
  if (row.status === "Paid" || row.status === "Cancelled" || row.balance <= 0) return "";
  if (!row.dueDate) return "No due date";
  if (row.daysLate > 0) return `${row.daysLate} day${row.daysLate > 1 ? "s" : ""} late`;
  const left = Math.round((row.dueDate - startOfToday()) / 864e5);
  return left === 0 ? "Due today" : `Due in ${left} day${left > 1 ? "s" : ""}`;
}

export function toCsv(rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Invoice", "Customer", "Email", "WhatsApp", "House", "Address", "Service", "Issue date", "Due date", "Amount (PKR)", "Received (PKR)", "Remaining (PKR)", "Status", "Method", "Notes"];
  const body = rows.map(r => [r.id, r.customer, r.customerEmail, r.customerPhone, r.house, r.address, r.service, fmtDate(r.date), fmtDate(r.dueDate), r.amount, r.paidAmount, r.balance, r.status, r.method, r.notes]);
  return [head, ...body].map(line => line.map(esc).join(",")).join("\n");
}
export function downloadText(name, text, type = "text/csv") {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// WhatsApp wants the number in international form without "+" or spaces. Local Pakistani numbers (03xx...) become 92 3xx...
export function waNumber(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return d;
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return "92" + d.slice(1);
  if (d.length === 10 && d.startsWith("3")) return "92" + d;
  return d;
}
export const isValidPhone = v => { const d = String(v || "").replace(/\D/g, ""); return /^[+\d][\d\s\-()]*$/.test(String(v).trim()) && d.length >= 7 && d.length <= 15; };
export const prettyPhone = v => { const n = waNumber(v); return n ? `+${n}` : ""; };

// Round business logo as an <img>, loaded once (used when drawing the invoice picture and PDF).
let logoPromise;
export const loadLogo = () => logoPromise ??= new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `${import.meta.env.BASE_URL}logo-512.png`; });

// ---------- Construction work & working permissions ----------
export const workAmount = (area, rate) => { const a = Number(area), r = Number(rate); return a > 0 && r > 0 ? Math.round(a * r * 100) / 100 : 0; };
export const num = n => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function normalizeWork(raw) {
  const permitStart = toLocalDay(raw.permitStart), permitDue = toLocalDay(raw.permitDue);
  return {
    id: raw.id, employee: raw.employee || "", employeePhone: raw.employeePhone || "", site: raw.site || "",
    areaSqft: Number(raw.areaSqft) || 0, ratePerSqft: Number(raw.ratePerSqft) || 0, amount: Number(raw.amount) || workAmount(raw.areaSqft, raw.ratePerSqft),
    status: raw.status || "Active", startedOn: toLocalDay(raw.startedOn), permitNo: raw.permitNo || "", permitAuthority: raw.permitAuthority || "",
    permitStart, permitDue, notes: raw.notes || "",
    history: (raw.permitHistory || []).map(h => ({ id: h.id, permitNo: h.permitNo || "", start: toLocalDay(h.permitStart), due: toLocalDay(h.permitDue), renewedAt: toLocalDay(h.renewedAt), note: h.note || "" })),
    permit: permitState(permitDue, raw.status || "Active")
  };
}

// How the working permission looks today. "soon" = expires this calendar month or within 30 days, so it shows in follow-up.
export function permitState(due, status = "Active") {
  if (status !== "Active") return { level: "closed", days: null, label: status === "Completed" ? "Work completed" : "Work cancelled" };
  if (!due) return { level: "none", days: null, label: "No permission date" };
  const today = startOfToday(), days = Math.round((due - today) / 864e5);
  if (days < 0) return { level: "expired", days, label: `Expired ${-days} day${-days > 1 ? "s" : ""} ago` };
  if (days === 0) return { level: "soon", days, label: "Expires today" };
  const sameMonth = due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear();
  if (days <= 30 || sameMonth) return { level: "soon", days, label: `Expires in ${days} day${days > 1 ? "s" : ""}` };
  return { level: "ok", days, label: `Valid · ${days} days left` };
}
export const permitNeedsAction = w => w.permit.level === "expired" || w.permit.level === "soon";

// ---------- Bills to pay (money you owe to a person), shaped like invoices so the same screens work ----------
export function normalizeBill(raw) {
  const r = normalize({ id: raw.id, customer: raw.payee, customerPhone: raw.payeePhone, service: raw.title, amount: raw.amount, date: raw.date, dueDate: raw.dueDate, paidAt: raw.paidAt, status: raw.status, payments: raw.payments, paidAmount: raw.paidAmount, method: raw.method, notes: raw.notes });
  return { ...r, kind: "bill", payeeType: raw.payeeType || "Other", category: raw.category || "Other" };
}
// Every payment made on a bill is money spent, so it appears in the expense lists, reports and budgets as a normal expense row.
export const billExpenseRows = bills => bills.flatMap(b => b.payments.map(p => ({ id: `bill:${b.id}:${p.id}`, billId: b.id, title: b.service, payee: b.customer, payeeType: b.payeeType, category: b.category, amount: p.amount, date: p.date, method: p.method, notes: p.note })));
// Wording for invoices (money coming in) and bills (money going out).
export const docLabels = d => d?.kind === "bill"
  ? { title: "PAYMENT SLIP", sub: "Payment to employee / seller", party: "Paid to", received: "Paid so far", due: "Balance to pay", paid: "Paid in full", method: "Not paid yet" }
  : { title: "INVOICE", sub: "Sales invoice", party: "Bill to", received: "Received", due: "Amount due", paid: "Paid in full", method: "Not paid yet" };
