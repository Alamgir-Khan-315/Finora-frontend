import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Plus, Trash2, Download, TrendingUp, TrendingDown, HandCoins, Receipt, Percent } from "lucide-react";
import { money, fmtDate, toInputDate, toLocalDay, downloadText, monthlyReport, expenseDate, incomeDate, MONTHS_LONG } from "../lib";
import { Button, Empty, Segmented } from "./ui";

export const CATEGORIES = ["Rent", "Utilities", "Salaries", "Marketing", "Software", "Travel", "Supplies", "Other"];
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
    sales.forEach(r => { set.add(r.date.getFullYear()); if (r.status === "Paid") set.add(incomeDate(r).getFullYear()); });
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
      <Stat tone="income" icon={HandCoins} label={`Income · ${year}`} value={money(t.income)} note="Invoices marked Paid" />
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
      <div className="panel-head"><div><h3>Month-wise report</h3><p>Income is counted in the month an invoice was paid. Expenses in the month they were spent.</p></div></div>
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

function Entries({ expenses, budgets, onAdd, onRemove, onSetLimit, notify }) {
  const [f, setF] = useState({ title: "", category: "Other", amount: "", date: toInputDate(), method: "Cash" });
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState("all");
  const rows = useMemo(() => expenses.map(e => ({ ...e, d: expenseDate(e) })).sort((a, b) => b.d - a.d), [expenses]);
  const months = useMemo(() => [...new Set(rows.map(r => `${r.d.getFullYear()}-${String(r.d.getMonth()).padStart(2, "0")}`))].sort().reverse(), [rows]);
  const shown = month === "all" ? rows : rows.filter(r => `${r.d.getFullYear()}-${String(r.d.getMonth()).padStart(2, "0")}` === month);
  const status = useMemo(() => budgetStatus(expenses, budgets), [expenses, budgets]);
  const monthTotal = status.reduce((a, s) => a + s.spent, 0);
  const pie = status.filter(s => s.spent > 0).map(s => ({ name: s.category, value: s.spent }));

  const submit = async e => {
    e.preventDefault();
    if (!f.title.trim()) return notify("Enter what the expense was for.", true);
    if (!(Number(f.amount) > 0)) return notify("Enter an amount greater than zero.", true);
    setBusy(true);
    try { await onAdd({ ...f, title: f.title.trim(), amount: Number(f.amount) }); setF(x => ({ ...x, title: "", amount: "" })); notify("Expense added"); }
    catch (ex) { notify(ex.message, true); } finally { setBusy(false); }
  };
  const csv = () => downloadText(`expenses-${toInputDate()}.csv`, [["Date", "Title", "Category", "Amount (PKR)", "Method"], ...shown.map(r => [fmtDate(r.d), r.title, r.category, r.amount, r.method])].map(l => l.map(csvCell).join(",")).join("\n"));

  return <>
    <section className="panel">
      <div className="panel-head"><div><h3>Add an expense</h3><p>It is saved to your database and counts in that month’s report.</p></div></div>
      <form className="form expense-form" onSubmit={submit}>
        <label>What for<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Office rent" /></label>
        <label>Category<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount (Rs)<input type="number" min="0" step="any" inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <div className="swap"><Button type="submit" disabled={busy}><Plus size={15} />Add</Button></div>
      </form>
    </section>

    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>This month’s budget</h3><p>Spent so far: <b className="num">{money(monthTotal)}</b>. Alerts at 80% and 100% of a limit.</p></div></div>
        <ul className="budget-list">{status.map(s => <li key={s.category} className={`lvl-${s.level}`}>
          <div className="budget-top"><b>{s.category}</b><span className="num">{money(s.spent)}{s.limit ? ` / ${money(s.limit)}` : ""}</span></div>
          <div className="meter"><i style={{ width: `${Math.min(100, s.pct * 100)}%` }} /></div>
          <div className="budget-bot">
            <small>{s.level === "over" ? `Over budget by ${money(s.spent - s.limit)}` : s.level === "warn" ? `${Math.round(s.pct * 100)}% used, close to the limit` : s.limit ? `${money(s.limit - s.spent)} left` : "No limit set"}</small>
            <input className="limit-input" type="number" min="0" placeholder="Set limit" defaultValue={s.limit || ""} key={s.category + s.limit} aria-label={`${s.category} monthly limit`}
              onBlur={async e => { const v = e.target.value; if (v === "" || Number(v) === s.limit) return; try { await onSetLimit(s.category, Number(v)); notify(`${s.category} limit saved`); } catch (ex) { notify(ex.message, true); } }} />
          </div>
        </li>)}</ul>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Where money went</h3><p>This month, by category</p></div></div>
        {pie.length === 0 ? <Empty title="No spending this month" text="Add an expense to see the split." /> : <>
          <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={pie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={98} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>{pie.map(p => <Cell key={p.name} fill={CAT_COLORS[CATEGORIES.indexOf(p.name)]} />)}</Pie>
            <Tooltip content={<Tip />} /></PieChart></ResponsiveContainer></div>
          <div className="legend pie-legend">{pie.map(p => <span key={p.name}><i style={{ background: CAT_COLORS[CATEGORIES.indexOf(p.name)] }} />{p.name}</span>)}</div></>}
      </section>
    </div>

    <section className="panel">
      <div className="panel-head"><div><h3>All expenses</h3><p>{shown.length} {shown.length === 1 ? "entry" : "entries"} · <b className="num">{money(shown.reduce((a, r) => a + Number(r.amount), 0))}</b></p></div>
        <div className="toolbar-right">
          <label className="filter"><span>Month</span><select value={month} onChange={e => setMonth(e.target.value)}><option value="all">All months</option>{months.map(m => { const [y, mo] = m.split("-"); return <option key={m} value={m}>{MONTHS_LONG[Number(mo)]} {y}</option>; })}</select></label>
          <Button kind="outline" onClick={csv} disabled={!shown.length}><Download size={15} />Export CSV</Button></div></div>
      {shown.length === 0 ? <Empty title="No expenses yet" text="Record spending above to track it against your income." /> :
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th className="r">Amount</th><th className="r"><span className="sr">Delete</span></th></tr></thead>
          <tbody>{shown.map(r => <tr key={r.id}><td>{fmtDate(r.d)}</td><td><b>{r.title}</b></td><td><span className="cat"><i style={{ background: CAT_COLORS[CATEGORIES.indexOf(r.category)] }} />{r.category}</span></td><td className="r num"><b>{money(r.amount)}</b></td>
            <td className="r"><Button kind="ghost" aria-label={`Delete ${r.title}`} onClick={async () => { if (!window.confirm(`Delete “${r.title}”?`)) return; try { await onRemove(r.id); notify("Expense deleted"); } catch (ex) { notify(ex.message, true); } }}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}

export default function Expenses({ sales, expenses, budgets, onAdd, onRemove, onSetLimit, notify }) {
  const [tab, setTab] = useState("report");
  return <>
    <Segmented label="Expenses section" value={tab} onChange={setTab} options={[["report", "Monthly report"], ["entries", "Expenses & budgets"]]} />
    {tab === "report" ? <Report sales={sales} expenses={expenses} /> : <Entries {...{ expenses, budgets, onAdd, onRemove, onSetLimit, notify }} />}
  </>;
}
