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
  const rawStatus = raw.status || "Pending";
  const today = startOfToday();
  const overdue = rawStatus === "Pending" && dueDate && dueDate < today;
  return {
    id: raw.id,
    customer: raw.customer || "",
    customerEmail: raw.customerEmail || "",
    service: raw.service || "",
    amount: Number(raw.amount) || 0,
    date, dueDate, rawStatus,
    status: overdue ? "Overdue" : rawStatus,
    daysLate: overdue ? Math.round((today - dueDate) / 864e5) : 0,
    method: raw.method || "Not recorded",
    notes: raw.notes || ""
  };
}

export const STATUSES = ["Paid", "Pending", "Overdue", "Cancelled"];
export const totalOf = (rows, status) => rows.filter(x => !status || x.status === status).reduce((a, x) => a + x.amount, 0);

export const RANGES = [
  ["all", "All time"], ["month", "This month"], ["30d", "Last 30 days"], ["year", "This year"]
];
export function inRange(row, range) {
  const now = new Date();
  if (range === "month") return row.date.getMonth() === now.getMonth() && row.date.getFullYear() === now.getFullYear();
  if (range === "year") return row.date.getFullYear() === now.getFullYear();
  if (range === "30d") return now - row.date <= 30 * 864e5 && row.date <= now;
  return true;
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

// Sample records for demo mode, always relative to today so they look current.
// Columns: customer, service, amount, issued N days ago, due N days ago (negative = in the future), status, method
export function demoSales() {
  const day = n => { const d = startOfToday(); d.setDate(d.getDate() - n); return d.toISOString(); };
  const rows = [
    ["Vertex Studio", "Website Development", 125000, 0, -14, "Paid", "Bank Transfer"],
    ["Northstar Labs", "UI/UX Design", 68000, 1, -13, "Pending", ""],
    ["Apex Traders", "SEO Services", 42000, 2, -12, "Paid", "Card"],
    ["Urban Nest", "Mobile App", 210000, 21, 7, "Pending", ""],
    ["Pixel House", "Brand Identity", 35000, 11, -3, "Paid", "Cash"],
    ["Bright Path", "Monthly Support", 18000, 17, 3, "Pending", ""],
    ["Orbit Foods", "Website Development", 86000, 5, -9, "Pending", ""],
    ["Vertex Studio", "Monthly Support", 24000, 20, 6, "Paid", "Bank Transfer"],
    ["Orbit Foods", "Website Development", 96000, 27, 13, "Paid", "Bank Transfer"],
    ["Apex Traders", "SEO Services", 42000, 34, 20, "Paid", "Card"],
    ["Northstar Labs", "Brand Identity", 52000, 41, 27, "Paid", "Online"],
    ["Urban Nest", "UI/UX Design", 74000, 58, 44, "Paid", "Bank Transfer"],
    ["Pixel House", "SEO Services", 38000, 66, 52, "Paid", "Cash"],
    ["Orbit Foods", "Mobile App", 180000, 88, 74, "Paid", "Bank Transfer"],
    ["Bright Path", "UI/UX Design", 46000, 97, 83, "Cancelled", ""],
    ["Vertex Studio", "Mobile App", 160000, 121, 107, "Paid", "Bank Transfer"]
  ];
  return rows.map((r, i) => ({
    id: `INV-${1060 - i}`, customer: r[0], customerEmail: `accounts@${r[0].toLowerCase().replace(/\s+/g, "")}.pk`,
    service: r[1], amount: r[2], date: day(r[3]), dueDate: day(r[4]), status: r[5], method: r[6] || "Not recorded", notes: ""
  }));
}
