import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Plus, Trash2, Download, ChevronDown, ChevronUp, Wallet, TrendingUp, TrendingDown, HandCoins, Receipt, Percent, Search, X, User } from "lucide-react";
import { isValidPhone, isOpen, money, fmtDate, toInputDate, toLocalDay, downloadText, monthlyReport, expenseDate, paymentEvents, MONTHS_LONG } from "../lib";
import { Button, Empty, Segmented, Status } from "./ui";

export const CATEGORIES = ["Rent", "Utilities", "Salaries", "Labour", "Materials", "Permits", "Marketing", "Software", "Travel", "Supplies", "Other"];
export const PAYEE_TYPES = ["Employee", "Seller", "Contractor", "Other"];
const catColor = c => CAT_COLORS[Math.max(0, CATEGORIES.indexOf(c)) % CAT_COLORS.length];
const CAT_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)", "var(--c7)", "var(--c8)"];
const thisMonth = d => { const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };
const signed = n => (n > 0 ? "+" : n < 0 ? "−" : "") + money(Math.abs(n));
const csvCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Month-to-date spend per category compared with its limit.
export function budgetStatus(expenses, budgets) {
  const spent = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  expenses.forEach(e => { const d = toLocalDay(e.date); if (d && thisMonth(d)) spent[e.category] = (spent[e.category] || 0) + Number(e.amount); });
  return CATEGORIES.map(c => { const limit = Number(budgets[c]) || 0; const pct = limit ? spent[c] / limit : 0;
    return { category: c, spent: spent[c], limit, pct, level: !limit ? "none" : pct >= 1 ? "over" : pct >= 0.8 ? "warn" : "ok" }; });
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><b>{label}</b>{payload.map(p => <div key={p.dataKey}><i style={{ background: p.color }} />{p.name}<span>{p.dataKey === "profit" ? signed(p.value) : money(p.value)}</span></div>)}</div>;
}

function Stat({ tone, icon: Icon, label, value, note }) {
  return <div className={`kpi kpi-${tone}`}><div className="kpi-icon"><Icon size={19} /></div>
    <div className="kpi-body"><span className="kpi-label">{label}</span><b className="kpi-value num">{value}</b><span className="kpi-note">{note}</span></div></div>;
}

function Report({ sales, expenses }) {
  const now = new Date();
  const years = useMemo(() => {
    const set = new Set([now.getFullYear()]);
    sales.forEach(r => set.add(r.date.getFullYear()));
    paymentEvents(sales).forEach(p => set.add(p.date.getFullYear()));
    expenses.forEach(e => set.add(expenseDate(e).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [sales, expenses]);
  const [year, setYear] = useState(now.getFullYear());
  const rows = useMemo(() => monthlyReport(sales, expenses, year), [sales, expenses, year]);
  const t = useMemo(() => rows.reduce((a, r) => ({ billed: a.billed + r.billed, income: a.income + r.income, expense: a.expense + r.expense }), { billed: 0, income: 0, expense: 0 }), [rows]);
  const profit = t.income - t.expense, margin = t.income > 0 ? (profit / t.income) * 100 : null;
  const best = rows.filter(r => r.active).sort((a, b) => b.profit - a.profit)[0];
  const isFuture = r => year > now.getFullYear() || (year === now.getFullYear() && r.m > now.getMonth());
  const chartData = rows.map(r => ({ label: r.label, income: r.income, expense: r.expense, profit: r.profit }));

  const exportCsv = () => downloadText(`profit-loss-${year}.csv`,
    [["Month", "Invoiced", "Income received", "Expenses", "Profit / Loss", "Margin %"],
     ...rows.map(r => [`${r.name} ${year}`, r.billed, r.income, r.expense, r.profit, r.margin === null ? "" : r.margin.toFixed(1)]),
     ["Total", t.billed, t.income, t.expense, profit, margin === null ? "" : margin.toFixed(1)]].map(l => l.map(csvCell).join(",")).join("\n"));

  return <>
    <div className="toolbar dash-bar">
      <label className="filter year"><span>Year</span><select value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      <Button kind="outline" onClick={exportCsv}><Download size={15} />Export CSV</Button>
    </div>

    <div className="kpis">
      <Stat tone="income" icon={HandCoins} label={`Income · ${year}`} value={money(t.income)} note="Payments received (part or full)" />
      <Stat tone="expense" icon={Receipt} label={`Expenses · ${year}`} value={money(t.expense)} note="All recorded spending" />
      <Stat tone={profit >= 0 ? "profit" : "loss"} icon={profit >= 0 ? TrendingUp : TrendingDown} label={profit >= 0 ? "Profit (benefit)" : "Loss"} value={signed(profit)} note={profit >= 0 ? "Income − expenses" : "Spent more than received"} />
      <Stat tone="wait" icon={Percent} label="Profit margin" value={margin === null ? "—" : `${margin.toFixed(1)}%`} note={best ? `Best: ${best.name}` : "No activity yet"} />
    </div>

    <section className="panel">
      <div className="panel-head"><div><h3>Income vs expenses</h3><p>Month by month in {year}. The line is your profit or loss.</p></div></div>
      <div className="chart-box tall">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3} barCategoryGap="22%">
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} width={48} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={v => Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--hover)" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: "var(--ink-2)" }} />
            <Bar dataKey="income" name="Income" fill="var(--income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="var(--expense)" radius={[4, 4, 0, 0]} />
            <Line dataKey="profit" name="Profit / loss" type="monotone" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--surface)", strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head"><div><h3>Month-wise report</h3><p>Income is counted in the month each payment was received. Expenses in the month they were spent.</p></div></div>
      <div className="table-wrap"><table className="report">
        <thead><tr><th>Month</th><th className="r">Invoiced</th><th className="r">Income</th><th className="r">Expenses</th><th className="r">Profit / Loss</th><th className="r">Margin</th></tr></thead>
        <tbody>{rows.map(r => {
          const cur = year === now.getFullYear() && r.m === now.getMonth();
          return <tr key={r.m} className={`${cur ? "current" : ""} ${!r.active ? "idle" : ""}`}>
            <td><b>{r.name}</b>{cur && <span className="tag">This month</span>}{isFuture(r) && <span className="tag mute">Upcoming</span>}</td>
            <td className="r num">{r.billed ? money(r.billed) : "—"}</td>
            <td className="r num inc">{r.income ? money(r.income) : "—"}</td>
            <td className="r num exp">{r.expense ? money(r.expense) : "—"}</td>
            <td className="r">{r.active ? <span className={`pl ${r.profit >= 0 ? "gain" : "lose"}`}>{r.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}<span className="num">{signed(r.profit)}</span><em>{r.profit > 0 ? "Profit" : r.profit < 0 ? "Loss" : "Even"}</em></span> : "—"}</td>
            <td className="r num">{r.margin === null ? "—" : `${r.margin.toFixed(0)}%`}</td>
          </tr>; })}</tbody>
        <tfoot><tr><td><b>Total {year}</b></td><td className="r num"><b>{money(t.billed)}</b></td><td className="r num inc"><b>{money(t.income)}</b></td><td className="r num exp"><b>{money(t.expense)}</b></td>
          <td className="r"><span className={`pl strong ${profit >= 0 ? "gain" : "lose"}`}>{profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}<span className="num">{signed(profit)}</span><em>{profit > 0 ? "Profit" : profit < 0 ? "Loss" : "Even"}</em></span></td>
          <td className="r num"><b>{margin === null ? "—" : `${margin.toFixed(0)}%`}</b></td></tr></tfoot>
      </table></div>
    </section>
  </>;
}

function Entries({ expenses, budgets, people, onAdd, onRemove, onSetLimit, notify }) {
  const [f, setF] = useState({ title: "", payee: "", payeeType: "Employee", category: "Other", amount: "", date: toInputDate(), method: "Cash" });
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState("all");
  const [q, setQ] = useState("");
  const [allPeople, setAllPeople] = useState(false), [allBudget, setAllBudget] = useState(false), [allRows, setAllRows] = useState(false);
  const rows = useMemo(() => expenses.map(e => ({ ...e, d: expenseDate(e) })).sort((a, b) => b.d - a.d), [expenses]);
  const months = useMemo(() => [...new Set(rows.map(r => `${r.d.getFullYear()}-${String(r.d.getMonth()).padStart(2, "0")}`))].sort().reverse(), [rows]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(r => (month === "all" || `${r.d.getFullYear()}-${String(r.d.getMonth()).padStart(2, "0")}` === month)
    && (!needle || [r.payee, r.title, r.category, r.payeeType, r.notes].join(" ").toLowerCase().includes(needle)));
  const status = useMemo(() => budgetStatus(expenses, budgets), [expenses, budgets]);
  const preview = useMemo(() => { const used = status.filter(x => x.limit || x.spent > 0).sort((a, b) => b.pct - a.pct || b.spent - a.spent); return (used.length ? used : status).slice(0, 4); }, [status]);
  const monthTotal = status.reduce((a, s) => a + s.spent, 0);
  const pie = status.filter(s => s.spent > 0).map(s => ({ name: s.category, value: s.spent }));
  const names = useMemo(() => [...new Set([...people, ...expenses.map(e => e.payee).filter(Boolean)])].sort((a, b) => a.localeCompare(b)), [people, expenses]);
  // Total spent on each person (employee / seller) in the rows currently shown.
  const byPerson = useMemo(() => {
    const m = new Map();
    shown.forEach(r => { const k = (r.payee || "").trim(); if (!k) return; const key = k.toLowerCase(); const p = m.get(key) || { name: k, type: r.payeeType, total: 0, count: 0, last: r.d }; p.total += Number(r.amount); p.count++; if (r.d > p.last) p.last = r.d; m.set(key, p); });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [shown]);
  const unnamed = shown.filter(r => !(r.payee || "").trim()).reduce((a, r) => a + Number(r.amount), 0);
  const exactPerson = names.find(n => n.toLowerCase() === needle);

  const submit = async e => {
    e.preventDefault();
    if (!f.title.trim()) return notify("Enter what the expense was for.", true);
    if (!(Number(f.amount) > 0)) return notify("Enter an amount greater than zero.", true);
    setBusy(true);
    try { await onAdd({ ...f, title: f.title.trim(), payee: f.payee.trim(), amount: Number(f.amount) }); setF(x => ({ ...x, title: "", amount: "" })); notify("Expense added"); }
    catch (ex) { notify(ex.message, true); } finally { setBusy(false); }
  };
  const csv = () => downloadText(`expenses-${toInputDate()}.csv`, [["Date", "Paid to", "Type", "Title", "Category", "Amount (PKR)", "Method"], ...shown.map(r => [fmtDate(r.d), r.payee, r.payee ? r.payeeType : "", r.title, r.category, r.amount, r.method])].map(l => l.map(csvCell).join(",")).join("\n"));

  return <>
    <section className="panel">
      <div className="panel-head"><div><h3>Add an expense</h3><p>It is saved to your database and counts in that month’s report.</p></div></div>
      <form className="form expense-form" onSubmit={submit}>
        <label>Paid to <em>employee / seller name</em><input list="payee-list" value={f.payee} onChange={e => setF({ ...f, payee: e.target.value })} placeholder="e.g. Ali Raza" /></label>
        <datalist id="payee-list">{names.map(n => <option key={n} value={n} />)}</datalist>
        <label>Person is a<select value={f.payeeType} onChange={e => setF({ ...f, payeeType: e.target.value })}>{PAYEE_TYPES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>What for<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Labour for plaster work" /></label>
        <label>Category<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount (Rs)<input type="number" min="0" step="any" inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <div className="swap"><Button type="submit" disabled={busy}><Plus size={15} />Add expense</Button></div>
      </form>
    </section>

    <section className="panel">
      <div className="panel-head"><div><h3>Spending by person</h3><p>How much you spent on each employee or seller{month !== "all" ? " in the selected month" : ""}{q ? ` matching “${q}”` : ""}. Tap a name to see every payment to them.</p></div></div>
      {byPerson.length === 0 ? <Empty title="No names yet" text="Fill “Paid to” when you add an expense and each person's total shows here." /> :
        <div className="table-wrap"><table className="compact"><thead><tr><th>Person</th><th>Type</th><th className="r">Payments</th><th>Last paid</th><th className="r">Total spent</th></tr></thead>
          <tbody>{(allPeople ? byPerson : byPerson.slice(0, 5)).map(p => <tr key={p.name} className="clickable" onClick={() => setQ(p.name)}><td><div className="who"><span className="avatar"><User size={14} /></span><b>{p.name}</b></div></td><td>{p.type}</td><td className="r num">{p.count}</td><td>{fmtDate(p.last)}</td><td className="r num"><b>{money(p.total)}</b></td></tr>)}</tbody></table></div>}
      {byPerson.length > 5 && <div className="view-all"><Button kind="ghost" onClick={() => setAllPeople(v => !v)}>{allPeople ? <><ChevronUp size={15} />Show top 5</> : <><ChevronDown size={15} />View all {byPerson.length} people</>}</Button></div>}
      {unnamed > 0 && <p className="hint">{money(unnamed)} was recorded without a person's name.</p>}
    </section>


    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>This month’s budget</h3><p>Spent so far: <b className="num">{money(monthTotal)}</b>. Alerts at 80% and 100% of a limit.</p></div></div>
        <ul className="budget-list">{(allBudget ? status : preview).map(s => <li key={s.category} className={`lvl-${s.level}`}>
          <div className="budget-top"><b>{s.category}</b><span className="num">{money(s.spent)}{s.limit ? ` / ${money(s.limit)}` : ""}</span></div>
          <div className="meter"><i style={{ width: `${Math.min(100, s.pct * 100)}%` }} /></div>
          <div className="budget-bot">
            <small>{s.level === "over" ? `Over budget by ${money(s.spent - s.limit)}` : s.level === "warn" ? `${Math.round(s.pct * 100)}% used, close to the limit` : s.limit ? `${money(s.limit - s.spent)} left` : "No limit set"}</small>
            <input className="limit-input" type="number" min="0" placeholder="Set limit" defaultValue={s.limit || ""} key={s.category + s.limit} aria-label={`${s.category} monthly limit`}
              onBlur={async e => { const v = e.target.value; if (v === "" || Number(v) === s.limit) return; try { await onSetLimit(s.category, Number(v)); notify(`${s.category} limit saved`); } catch (ex) { notify(ex.message, true); } }} />
          </div>
        </li>)}</ul>
        {status.length > preview.length && <div className="view-all"><Button kind="ghost" onClick={() => setAllBudget(v => !v)}>{allBudget ? <><ChevronUp size={15} />Show fewer</> : <><ChevronDown size={15} />View all {status.length} categories</>}</Button></div>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Where money went</h3><p>This month, by category</p></div></div>
        {pie.length === 0 ? <Empty title="No spending this month" text="Add an expense to see the split." /> : <>
          <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={pie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={98} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>{pie.map(p => <Cell key={p.name} fill={catColor(p.name)} />)}</Pie>
            <Tooltip content={<Tip />} /></PieChart></ResponsiveContainer></div>
          <div className="legend pie-legend">{pie.map(p => <span key={p.name}><i style={{ background: catColor(p.name) }} />{p.name}</span>)}</div></>}
      </section>
    </div>


    <section className="panel">
      <div className="panel-head"><div><h3>All expenses</h3><p>{shown.length} {shown.length === 1 ? "entry" : "entries"} · <b className="num">{money(shown.reduce((a, r) => a + Number(r.amount), 0))}</b>{exactPerson ? <> · total spent on <b>{exactPerson}</b></> : null}</p></div>
        <div className="toolbar-right">
          <label className="search"><Search size={16} /><input placeholder="Search employee, seller, title…" value={q} onChange={e => setQ(e.target.value)} />{q && <button type="button" className="clear-x" onClick={() => setQ("")} aria-label="Clear search"><X size={14} /></button>}</label>
          <label className="filter"><span>Month</span><select value={month} onChange={e => setMonth(e.target.value)}><option value="all">All months</option>{months.map(m => { const [y, mo] = m.split("-"); return <option key={m} value={m}>{MONTHS_LONG[Number(mo)]} {y}</option>; })}</select></label>
          <Button kind="outline" onClick={csv} disabled={!shown.length}><Download size={15} />Export CSV</Button></div></div>
      {shown.length === 0 ? <Empty title={rows.length ? "No expenses match" : "No expenses yet"} text={rows.length ? "Try another name or month." : "Record spending above to track it against your income."} /> :
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Paid to</th><th>Title</th><th>Category</th><th className="r">Amount</th><th className="r"><span className="sr">Delete</span></th></tr></thead>
          <tbody>{(q || allRows ? shown : shown.slice(0, 8)).map(r => <tr key={r.id}><td>{fmtDate(r.d)}</td><td>{r.billId && <small>Bill payment</small>}{r.payee ? <><b className="link-name" onClick={() => setQ(r.payee)}>{r.payee}</b><small>{r.payeeType}</small></> : "—"}</td><td><b>{r.title}</b></td><td><span className="cat"><i style={{ background: catColor(r.category) }} />{r.category}</span></td><td className="r num"><b>{money(r.amount)}</b></td>
            <td className="r"><Button kind="ghost" aria-label={`Delete ${r.title}`} onClick={async () => { if (!window.confirm(`Delete “${r.title}”?`)) return; try { await onRemove(r.id); notify("Expense deleted"); } catch (ex) { notify(ex.message, true); } }}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div>}
      {!q && shown.length > 8 && <div className="view-all"><Button kind="ghost" onClick={() => setAllRows(v => !v)}>{allRows ? <><ChevronUp size={15} />Show latest 8</> : <><ChevronDown size={15} />View all {shown.length} expenses</>}</Button></div>}
    </section>
  </>;
}


function Bills({ bills, people, onAdd, onOpen, notify }) {
  const due = new Date(); due.setDate(due.getDate() + 14);
  const [f, setF] = useState({ payee: "", payeePhone: "", payeeType: "Employee", title: "", category: "Labour", amount: "", dueDate: toInputDate(due), paidNow: "", method: "Cash" });
  const [busy, setBusy] = useState(false), [q, setQ] = useState(""), [tab, setTab] = useState("open"), [all, setAll] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const names = useMemo(() => [...new Set([...people, ...bills.map(b => b.customer)])].sort((a, b) => a.localeCompare(b)), [people, bills]);
  const total = Number(f.amount) || 0, paid = Number(f.paidNow) || 0;
  const pickPerson = v => { const known = bills.find(b => b.customer.toLowerCase() === v.trim().toLowerCase()); setF(x => ({ ...x, payee: v, payeePhone: x.payeePhone || known?.customerPhone || "", payeeType: known?.payeeType || x.payeeType })); };
  const toPay = bills.filter(isOpen).reduce((a, b) => a + b.balance, 0);
  const shown = bills.filter(b => (tab === "all" || (tab === "open" && isOpen(b)) || (tab === "paid" && b.status === "Paid")) && [b.customer, b.service, b.category].join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  const list = q || all ? shown : shown.slice(0, 8);

  const submit = async e => {
    e.preventDefault();
    if (!f.payee.trim()) return notify("Enter the name of the person you pay.", true);
    if (f.payeePhone.trim() && !isValidPhone(f.payeePhone)) return notify("WhatsApp number looks wrong. Use e.g. 0300 1234567.", true);
    if (!f.title.trim()) return notify("Enter what the payment is for.", true);
    if (!(total > 0)) return notify("Enter the total amount you have to pay.", true);
    if (paid < 0 || paid > total) return notify("Amount paid now must be between 0 and the total.", true);
    setBusy(true);
    try { await onAdd({ ...f, payee: f.payee.trim(), title: f.title.trim(), amount: total, paidNow: paid, method: paid > 0 ? f.method : "Not recorded" }); setF(x => ({ ...x, payee: "", payeePhone: "", title: "", amount: "", paidNow: "" })); }
    catch (ex) { notify(ex.message, true); } finally { setBusy(false); }
  };

  return <>
    <section className="panel">
      <div className="panel-head"><div><h3>New bill to pay</h3><p>Money you have to give to an employee, seller or contractor. Pay it in parts; each payment counts as an expense and the person can get a WhatsApp update.</p></div></div>
      <form className="form expense-form" onSubmit={submit}>
        <label>Pay to <em>name</em><input list="bill-people" value={f.payee} onChange={e => pickPerson(e.target.value)} placeholder="e.g. Bilal Ahmed" /></label>
        <datalist id="bill-people">{names.map(n => <option key={n} value={n} />)}</datalist>
        <label>WhatsApp number <em>for updates</em><input type="tel" inputMode="tel" value={f.payeePhone} onChange={e => set("payeePhone", e.target.value)} placeholder="0300 1234567" /></label>
        <label>Person is a<select value={f.payeeType} onChange={e => set("payeeType", e.target.value)}>{PAYEE_TYPES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>What for<input value={f.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Plaster work, Plot 12" /></label>
        <label>Category<select value={f.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Total to pay (Rs)<input type="number" min="0" step="any" inputMode="decimal" value={f.amount} onChange={e => set("amount", e.target.value)} /></label>
        <label>Pay by <em>due date</em><input type="date" value={f.dueDate} onChange={e => set("dueDate", e.target.value)} /></label>
        <label>Paid now <em>optional</em><input type="number" min="0" step="any" inputMode="decimal" value={f.paidNow} onChange={e => set("paidNow", e.target.value)} placeholder="0" /></label>
        {paid > 0 ? <label>Paid by<select value={f.method} onChange={e => set("method", e.target.value)}><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Online</option><option>Cheque</option></select></label> : <div />}
        {total > 0 && <div className="pay-hint" style={{ gridColumn: "1 / -1" }}>{paid >= total ? "Whole amount paid: the bill will be marked Paid." : paid > 0 ? `${money(paid)} paid, ${money(total - paid)} still to pay (Partial).` : "Nothing paid yet. You can record payments later, in parts."}</div>}
        <div className="swap"><Button type="submit" disabled={busy}><Plus size={15} />Save bill</Button></div>
      </form>
    </section>

    <section className="panel">
      <div className="panel-head"><div><h3>Bills to pay</h3><p>Still to pay: <b className="num">{money(toPay)}</b> · open a bill to record a payment, send a WhatsApp update or download the slip.</p></div>
        <div className="toolbar-right"><label className="search"><Search size={16} /><input placeholder="Search name, title…" value={q} onChange={e => setQ(e.target.value)} /></label></div></div>
      <div className="toolbar"><Segmented label="Show" value={tab} onChange={setTab} options={[["open", "To pay"], ["paid", "Paid"], ["all", "All"]]} /></div>
      {shown.length === 0 ? <Empty title={bills.length ? "Nothing here" : "No bills yet"} text={bills.length ? "Try another filter or search." : "Add the money you owe to someone above."} /> :
        <div className="table-wrap"><table><thead><tr><th>Person</th><th>For</th><th className="r">Total</th><th className="r">Paid / left</th><th>Status</th></tr></thead>
          <tbody>{list.map(b => <tr key={b.id} className="clickable" onClick={() => onOpen(b)}>
            <td><b>{b.customer}</b><small>{b.payeeType}</small></td><td>{b.service}<small>{b.category}{b.dueDate ? ` · due ${fmtDate(b.dueDate)}` : ""}</small></td>
            <td className="r num"><b>{money(b.amount)}</b></td><td className="r num">{money(b.paidAmount)}<small>left {money(b.balance)}</small></td><td><Status value={b.status} /></td></tr>)}</tbody></table></div>}
      {!q && shown.length > 8 && <div className="view-all"><Button kind="ghost" onClick={() => setAll(v => !v)}>{all ? <><ChevronUp size={15} />Show latest 8</> : <><ChevronDown size={15} />View all {shown.length} bills</>}</Button></div>}
    </section>
  </>;
}

export default function Expenses({ sales, expenses, bills = [], budgets, people = [], onAdd, onAddBill, onOpenBill, onRemove, onSetLimit, notify }) {
  const [tab, setTab] = useState("report");
  return <>
    <Segmented label="Expenses section" value={tab} onChange={setTab} options={[["report", "Monthly report"], ["entries", "Expenses & budgets"], ["bills", `Bills to pay${bills.filter(isOpen).length ? ` (${bills.filter(isOpen).length})` : ""}`]]} />
    {tab === "report" ? <Report sales={sales} expenses={expenses} /> : tab === "bills" ? <Bills {...{ bills, people, onAdd: onAddBill, onOpen: onOpenBill, notify }} /> : <Entries {...{ expenses, budgets, people, onAdd, onRemove, onSetLimit, notify }} />}
  </>;
}
