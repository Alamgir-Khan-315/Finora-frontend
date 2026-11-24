// Excel (.xlsx) downloads for Sales, Customers, one Customer, Expenses and Profit & Loss.
// Every file has the same look: logo + business name, a title saying what the sheet is, a styled table and totals.
import { Workbook, addReport, downloadBlob } from "./xlsx";
import { siteOf, MONTHS } from "./lib";

const dmy = d => `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const slug = s => String(s || "").trim().replace(/[^\w\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "") || "Finora";
const compact = parts => parts.filter(Boolean).join("   ·   ");

// The Finora logo as PNG bytes (null if it cannot be loaded; the sheet is then made without it).
export async function logoBytes() {
  try { const r = await fetch(`${import.meta.env.BASE_URL}logo-192.png`); if (!r.ok) return null; return new Uint8Array(await r.arrayBuffer()); } catch { return null; }
}

// One row per customer, built from the invoices (cancelled invoices are not counted).
export function customerList(rows) {
  const map = new Map();
  rows.forEach(r => {
    if (r.status === "Cancelled") return;
    const c = map.get(r.customer) || { name: r.customer, email: r.customerEmail, phone: r.customerPhone, house: r.house, address: r.address, count: 0, billed: 0, paid: 0, owing: 0, last: r.date };
    c.count++; c.billed += r.amount; c.paid += r.paidAmount; c.owing += r.balance;
    if (r.date > c.last) c.last = r.date;
    if (!c.email && r.customerEmail) c.email = r.customerEmail;
    if (!c.phone && r.customerPhone) c.phone = r.customerPhone;
    map.set(r.customer, c);
  });
  return [...map.values()].sort((a, b) => b.owing - a.owing || b.billed - a.billed);
}

const base = (o, logo) => { const wb = new Workbook(); wb.logo = logo || null; return { wb, now: o.now || new Date() }; };

// ---------- builders (pure: return a Workbook) ----------
export function buildSales({ rows, business, filters = [], logo, now }) {
  const { wb, now: t } = base({ now }, logo), date = dmy(t);
  const live = rows.filter(r => r.status !== "Cancelled");
  addReport(wb, {
    name: "Invoices", business, title: "Sales Report", date, totalWord: "Invoices",
    subtitle: compact(["Invoice data", ...(filters.length ? filters : ["All invoices"])]),
    cardRows: [[
      { label: "Invoices", value: rows.length, fmt: "int" },
      { label: "Total invoiced (PKR)", value: live.reduce((a, r) => a + r.amount, 0), fmt: "money" },
      { label: "Received (PKR)", value: live.reduce((a, r) => a + r.paidAmount, 0), fmt: "money", tone: "good" },
      { label: "Still to receive (PKR)", value: live.reduce((a, r) => a + r.balance, 0), fmt: "money", tone: live.some(r => r.balance > 0) ? "bad" : "good" }
    ]],
    columns: [
      { h: "S.No", w: 7, type: "center", get: (r, i) => i + 1 },
      { h: "Invoice No", w: 14, type: "text", get: r => r.id },
      { h: "Date", w: 13, type: "date", get: r => r.date },
      { h: "Customer Name", w: 24, type: "text", get: r => r.customer },
      { h: "WhatsApp", w: 16, type: "text", get: r => r.customerPhone },
      { h: "House / Address", w: 26, type: "text", get: r => siteOf(r) },
      { h: "Service", w: 26, type: "text", get: r => r.service },
      { h: "Due Date", w: 13, type: "date", get: r => r.dueDate },
      { h: "Amount (PKR)", w: 16, type: "money", total: "sum", get: r => r.status === "Cancelled" ? null : r.amount },
      { h: "Received (PKR)", w: 16, type: "money", total: "sum", get: r => r.status === "Cancelled" ? null : r.paidAmount },
      { h: "Remaining (PKR)", w: 16, type: "money", total: "sum", tone: r => r.status !== "Cancelled" && r.balance > 0 ? "bad" : null, get: r => r.status === "Cancelled" ? null : r.balance },
      { h: "Status", w: 13, type: "status", get: r => r.status },
      { h: "Method", w: 14, type: "center", get: r => r.method === "Not recorded" ? "" : r.method }
    ],
    rows
  });
  return wb;
}

export function buildCustomers({ customers, business, logo, now }) {
  const { wb, now: t } = base({ now }, logo), date = dmy(t);
  addReport(wb, {
    name: "Customers", business, title: "Customer Report", date, totalWord: "Customers",
    subtitle: "Customer summary  ·  who you sell to and who still owes you",
    cardRows: [[
      { label: "Customers", value: customers.length, fmt: "int" },
      { label: "Total billed (PKR)", value: customers.reduce((a, c) => a + c.billed, 0), fmt: "money" },
      { label: "Received (PKR)", value: customers.reduce((a, c) => a + c.paid, 0), fmt: "money", tone: "good" },
      { label: "Still owed (PKR)", value: customers.reduce((a, c) => a + c.owing, 0), fmt: "money", tone: customers.some(c => c.owing > 0) ? "bad" : "good" }
    ]],
    columns: [
      { h: "S.No", w: 7, type: "center", get: (c, i) => i + 1 },
      { h: "Customer Name", w: 26, type: "text", get: c => c.name },
      { h: "WhatsApp", w: 16, type: "text", get: c => c.phone },
      { h: "Email", w: 26, type: "text", get: c => c.email },
      { h: "House", w: 10, type: "center", get: c => c.house },
      { h: "Address", w: 24, type: "text", get: c => c.address },
      { h: "Invoices", w: 11, type: "int", total: "sum", get: c => c.count },
      { h: "Billed (PKR)", w: 16, type: "money", total: "sum", get: c => c.billed },
      { h: "Paid (PKR)", w: 16, type: "money", total: "sum", get: c => c.paid },
      { h: "Still owes (PKR)", w: 17, type: "money", total: "sum", tone: c => c.owing > 0 ? "bad" : "good", get: c => c.owing },
      { h: "Last invoice", w: 14, type: "date", get: c => c.last }
    ],
    rows: customers
  });
  return wb;
}

// One customer's own file: details, summary, every invoice and every payment.
export function buildCustomer({ customer: c, invoices, business, logo, now }) {
  const { wb, now: t } = base({ now }, logo), date = dmy(t);
  const rows = invoices.filter(r => r.status !== "Cancelled").sort((a, b) => a.date - b.date);
  const billed = rows.reduce((a, r) => a + r.amount, 0), paid = rows.reduce((a, r) => a + r.paidAmount, 0), owing = rows.reduce((a, r) => a + r.balance, 0);
  addReport(wb, {
    name: "Statement", business, title: "Customer Statement", date, totalWord: "Invoices",
    subtitle: `Individual customer sheet  ·  ${c.name}`,
    cardRows: [
      [{ label: "Customer", value: c.name, weight: 2 }, { label: "WhatsApp", value: c.phone, weight: 2 }, { label: "Email", value: c.email, weight: 2 }, { label: "House", value: c.house, weight: 1 }, { label: "Address", value: c.address, weight: 2 }],
      [{ label: "Invoices", value: rows.length, fmt: "int" }, { label: "Billed (PKR)", value: billed, fmt: "money" }, { label: "Paid (PKR)", value: paid, fmt: "money", tone: "good" }, { label: "Still owes (PKR)", value: owing, fmt: "money", tone: owing > 0 ? "bad" : "good" }]
    ],
    columns: [
      { h: "S.No", w: 7, type: "center", get: (r, i) => i + 1 },
      { h: "Invoice No", w: 14, type: "text", get: r => r.id },
      { h: "Date", w: 13, type: "date", get: r => r.date },
      { h: "Service", w: 30, type: "text", wrap: true, get: r => r.service },
      { h: "Due Date", w: 13, type: "date", get: r => r.dueDate },
      { h: "Amount (PKR)", w: 16, type: "money", total: "sum", get: r => r.amount },
      { h: "Received (PKR)", w: 16, type: "money", total: "sum", get: r => r.paidAmount },
      { h: "Remaining (PKR)", w: 16, type: "money", total: "sum", tone: r => r.balance > 0 ? "bad" : null, get: r => r.balance },
      { h: "Status", w: 13, type: "status", get: r => r.status }
    ],
    rows
  });
  const pays = rows.flatMap(r => r.payments.map(p => ({ ...p, invoice: r.id }))).sort((a, b) => a.date - b.date);
  if (pays.length) addReport(wb, {
    name: "Payments", business, title: "Payment History", date, totalWord: "Payments",
    subtitle: `Money received from ${c.name}`,
    columns: [
      { h: "S.No", w: 7, type: "center", get: (p, i) => i + 1 },
      { h: "Date", w: 14, type: "date", get: p => p.date },
      { h: "Invoice No", w: 16, type: "text", get: p => p.invoice },
      { h: "Method", w: 16, type: "center", get: p => p.method },
      { h: "Note", w: 30, type: "text", get: p => p.note },
      { h: "Amount (PKR)", w: 18, type: "money", total: "sum", get: p => p.amount }
    ],
    rows: pays
  });
  return wb;
}

export function buildExpenses({ rows, business, filters = [], logo, now, title = "Expense Report", kind = "Expense sheet" }) {
  const { wb, now: t } = base({ now }, logo), date = dmy(t);
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  addReport(wb, {
    name: "Expenses", business, title, date, totalWord: "Expenses",
    subtitle: compact([kind, ...(filters.length ? filters : ["All expenses"])]),
    cardRows: [[
      { label: "Entries", value: rows.length, fmt: "int" },
      { label: "Total spent (PKR)", value: total, fmt: "money", tone: "bad" },
      { label: "People paid", value: new Set(rows.map(r => (r.payee || "").trim().toLowerCase()).filter(Boolean)).size, fmt: "int" }
    ]],
    columns: [
      { h: "S.No", w: 7, type: "center", get: (r, i) => i + 1 },
      { h: "Date", w: 14, type: "date", get: r => r.d },
      { h: "Paid To", w: 24, type: "text", get: r => r.payee },
      { h: "Type", w: 13, type: "center", get: r => r.payee ? r.payeeType : "" },
      { h: "Title / What for", w: 34, type: "text", get: r => r.title },
      { h: "Category", w: 15, type: "center", get: r => r.category },
      { h: "Method", w: 14, type: "center", get: r => r.method },
      { h: "Amount (PKR)", w: 17, type: "money", total: "sum", get: r => Number(r.amount) }
    ],
    rows
  });
  return wb;
}

export function buildProfitLoss({ rows, year, business, logo, now }) {
  const { wb, now: t } = base({ now }, logo), date = dmy(t);
  const sum = k => rows.reduce((a, r) => a + r[k], 0), income = sum("income"), expense = sum("expense"), profit = income - expense;
  addReport(wb, {
    name: `Profit & Loss ${year}`, business, title: "Profit & Loss", date, totalText: `Total ${year}`,
    subtitle: `Month-wise report  ·  ${year}  ·  income is counted in the month it was received`,
    cardRows: [[
      { label: `Income ${year} (PKR)`, value: income, fmt: "money", tone: "good" },
      { label: `Expenses ${year} (PKR)`, value: expense, fmt: "money", tone: "bad" },
      { label: profit >= 0 ? "Profit (PKR)" : "Loss (PKR)", value: profit, fmt: "money", tone: profit >= 0 ? "good" : "bad" },
      { label: "Profit margin", value: income > 0 ? `${((profit / income) * 100).toFixed(1)}%` : "—" }
    ]],
    columns: [
      { h: "Month", w: 18, type: "text", get: r => `${r.name} ${year}` },
      { h: "Invoiced (PKR)", w: 18, type: "money", total: "sum", get: r => r.active ? r.billed : null },
      { h: "Income received (PKR)", w: 20, type: "money", total: "sum", get: r => r.active ? r.income : null },
      { h: "Expenses (PKR)", w: 18, type: "money", total: "sum", get: r => r.active ? r.expense : null },
      { h: "Profit / Loss (PKR)", w: 19, type: "money", total: "sum", tone: r => r.active ? (r.profit >= 0 ? "good" : "bad") : null, get: r => r.active ? r.profit : null },
      { h: "Result", w: 13, type: "pl", get: r => !r.active ? "No activity" : r.profit > 0 ? "Profit" : r.profit < 0 ? "Loss" : "Even" },
      { h: "Margin", w: 11, type: "pct", get: r => r.margin === null || !r.active ? null : Number(r.margin.toFixed(1)) }
    ],
    rows
  });
  return wb;
}

// ---------- downloads ----------
const save = (wb, name) => downloadBlob(wb.blob(), name);
export async function exportSales(o) { save(buildSales({ ...o, logo: await logoBytes() }), `${slug(o.business)}-Sales-Report-${iso(new Date())}.xlsx`); }
export async function exportCustomers(o) { save(buildCustomers({ ...o, logo: await logoBytes() }), `${slug(o.business)}-Customers-${iso(new Date())}.xlsx`); }
export async function exportCustomer(o) { save(buildCustomer({ ...o, logo: await logoBytes() }), `Customer-${slug(o.customer.name)}-${iso(new Date())}.xlsx`); }
export async function exportExpenses(o) { save(buildExpenses({ ...o, logo: await logoBytes() }), `${o.fileName ? slug(o.fileName) : `${slug(o.business)}-Expense-Report`}-${iso(new Date())}.xlsx`); }
export async function exportProfitLoss(o) { save(buildProfitLoss({ ...o, logo: await logoBytes() }), `${slug(o.business)}-Profit-Loss-${o.year}.xlsx`); }
