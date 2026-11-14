import React, { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Check, TrendingUp, TrendingDown, HandCoins, Receipt, Clock3, ShieldAlert } from "lucide-react";
import { money, fmtDate, dueText, RANGES, dateInRange, paymentEvents, expenseDate, isOpen, permitNeedsAction } from "../lib";
import { PermitBadge } from "./WorkOrders";
import { Status, Button, Empty, Count, Segmented } from "./ui";

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const PIE = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)", "var(--c7)"];

function monthlyData(allRows) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), paid: 0, unpaid: 0 };
  });
  allRows.forEach(r => {
    if (r.status === "Cancelled") return;
    const m = months.find(x => x.key === `${r.date.getFullYear()}-${r.date.getMonth()}`);
    if (m) { m.paid += r.paidAmount; m.unpaid += r.balance; }
  });
  return months;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><b>{label}</b>{payload.map(p => <div key={p.dataKey}><i style={{ background: p.color }} />{p.name}<span>{money(p.value)}</span></div>)}</div>;
}

function Kpi({ tone, icon: Icon, label, value, note, signed }) {
  return <div className={`kpi kpi-${tone}`}>
    <div className="kpi-icon"><Icon size={19} /></div>
    <div className="kpi-body">
      <span className="kpi-label">{label}</span>
      <b className="kpi-value num"><Count value={value} format={v => (signed && v > 0 ? "+" : signed && v < 0 ? "−" : "") + money(Math.abs(v))} ms={1000} /></b>
      <span className="kpi-note">{note}</span>
    </div>
  </div>;
}

export default function Dashboard({ rows, allRows, expenses, works = [], range, setRange, onOpen, onMarkPaid, goSales, goExpenses, goWork }) {
  const rangeLabel = RANGES.find(r => r[0] === range)[1];
  const live = rows.filter(x => x.status !== "Cancelled");
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const paid = sum(live, x => x.paidAmount);
  const pending = sum(live.filter(x => x.status === "Pending" || x.status === "Partial"), x => x.balance);
  const overdue = sum(live.filter(x => x.status === "Overdue"), x => x.balance);
  const billed = sum(live, x => x.amount);
  const count = s => rows.filter(x => x.status === s || (s === "Pending" && x.status === "Partial")).length;

  // Cash view for the same period: money actually received minus money spent.
  const received = useMemo(() => paymentEvents(allRows).filter(p => dateInRange(p.date, range)).reduce((a, p) => a + p.amount, 0), [allRows, range]);
  const spent = useMemo(() => expenses.filter(e => dateInRange(expenseDate(e), range)).reduce((a, e) => a + (Number(e.amount) || 0), 0), [expenses, range]);
  const net = received - spent;
  const toCollect = allRows.filter(isOpen).reduce((a, x) => a + x.balance, 0);
  const unpaidCount = allRows.filter(isOpen).length;
  const permitAlerts = useMemo(() => works.filter(permitNeedsAction).sort((a, b) => (a.permitDue || 0) - (b.permitDue || 0)), [works]);

  const chart = useMemo(() => monthlyData(allRows), [allRows]);
  const followUp = useMemo(() => allRows.filter(isOpen)
    .sort((a, b) => (b.daysLate - a.daysLate) || ((a.dueDate || 9e15) - (b.dueDate || 9e15))).slice(0, 6), [allRows]);
  const recent = rows.slice(0, 6);
  const byService = useMemo(() => {
    const m = new Map(); rows.filter(x => x.status !== "Cancelled").forEach(r => m.set(r.service, (m.get(r.service) || 0) + r.amount));
    return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const cols = [
    ["paid", "Received", paid, count("Paid"), "invoices fully paid"],
    ["pending", "Waiting for payment", pending, count("Pending"), "invoices not yet due"],
    ["overdue", "Overdue", overdue, count("Overdue"), "past their due date"]
  ];

  return <>
    <div className="toolbar dash-bar">
      <Segmented label="Period" value={range} onChange={setRange} options={RANGES} />
      <span className="hint">Showing <b>{rangeLabel.toLowerCase()}</b></span>
    </div>

    <div className="kpis">
      <Kpi tone="income" icon={HandCoins} label="Money received" value={received} note="Payments received, part or full" />
      <Kpi tone="expense" icon={Receipt} label="Expenses" value={spent} note="Money spent" />
      <Kpi tone={net >= 0 ? "profit" : "loss"} icon={net >= 0 ? TrendingUp : TrendingDown} label={net >= 0 ? "Net profit" : "Net loss"} value={net} signed note="Received − expenses" />
      <Kpi tone="wait" icon={Clock3} label="Still to collect" value={toCollect} note={`${unpaidCount} unpaid · all time`} />
    </div>
    {range !== "all" && spent === 0 && <button className="nudge" onClick={goExpenses}>No expenses recorded for this period yet. Add them in Expenses to see your real profit →</button>}

    <section className="panel hero">
      <div className="hero-top">
        <div>
          <div className="hero-label">Invoiced · {rangeLabel}</div>
          <div className="hero-amount"><Count value={billed} format={money} /></div>
          <div className="hero-sub">{rows.filter(x => x.status !== "Cancelled").length} invoices issued</div>
        </div>
        <div className="hero-rate"><b><Count value={pct(paid, billed)} format={v => `${Math.round(v)}%`} ms={1100} /></b><span>collected so far</span></div>
      </div>
      <div className="split-bar" role="img" aria-label={`Paid ${pct(paid, billed)}%, waiting ${pct(pending, billed)}%, overdue ${pct(overdue, billed)}%`}>
        {cols.map(([k, , v]) => v > 0 && <span key={k} className={`seg seg-${k}`} style={{ flexGrow: v }} />)}
        {!billed && <span className="seg seg-empty" style={{ flexGrow: 1 }} />}
      </div>
      <div className="hero-cols">
        {cols.map(([k, label, v, n, note]) => <div key={k} className={`hero-col col-${k}`}>
          <div className="hero-col-label"><i />{label}</div>
          <div className="hero-col-amount"><Count value={v} format={money} ms={1100} /></div>
          <div className="hero-col-note">{n} {note}</div>
        </div>)}
      </div>
    </section>

    {permitAlerts.length > 0 && <section className="panel permit-alert">
      <div className="panel-head"><div><h3><ShieldAlert size={18} /> Working permissions to renew</h3><p>Expired or expiring this month. Renew them so work can continue legally.</p></div><Button kind="outline" onClick={goWork}>Open work &amp; permissions</Button></div>
      <ul className="followup">{permitAlerts.slice(0, 6).map(w => <li key={w.id}>
        <button className="followup-main" onClick={goWork}><b>{w.employee}</b><span>{w.site}{w.permitNo ? ` · ${w.permitNo}` : ""} · due {fmtDate(w.permitDue)}</span></button>
        <PermitBadge permit={w.permit} />
      </li>)}</ul>
    </section>}

    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>Sales by month</h3><p>Last 6 months, by invoice date</p></div>
          <div className="legend"><span><i className="seg-paid" />Received</span><span><i className="seg-pending" />Not paid yet</span></div></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "var(--hover)" }} />
              <Bar dataKey="paid" name="Paid" stackId="a" fill="var(--paid)" />
              <Bar dataKey="unpaid" name="Not paid yet" stackId="a" fill="var(--pending)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h3>Needs follow-up</h3><p>Unpaid invoices, most urgent first</p></div></div>
        {followUp.length === 0 ? <Empty title="Nothing to chase" text="Every invoice is paid or cancelled." /> :
          <ul className="followup">{followUp.map(r => <li key={r.id}>
            <button className="followup-main" onClick={() => onOpen(r)}>
              <b>{r.customer}</b>
              <span className={r.daysLate ? "late" : ""}>{r.id} · {dueText(r)}{r.paidAmount > 0 ? ` · received ${money(r.paidAmount)}` : ""}</span>
            </button>
            <b className="num">{money(r.balance)}</b>
            <Button kind="ghost" onClick={() => onMarkPaid(r)} title="Mark the remaining amount as paid"><Check size={15} />Paid</Button>
          </li>)}</ul>}
      </section>
    </div>

    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>Latest invoices</h3><p>{rangeLabel}</p></div><Button kind="ghost" onClick={goSales}>See all sales</Button></div>
        {recent.length === 0 ? <Empty title="No invoices in this period" text="Create a sale to see it here." /> :
          <div className="table-wrap"><table className="compact"><thead><tr><th>Invoice</th><th>Customer</th><th className="r">Amount</th><th>Status</th></tr></thead>
            <tbody>{recent.map(r => <tr key={r.id} className="clickable" onClick={() => onOpen(r)}>
              <td><b>{r.id}</b><small>{fmtDate(r.date)}</small></td><td>{r.customer}<small>{r.service}</small></td><td className="r num"><b>{money(r.amount)}</b></td><td><Status value={r.status} /></td>
            </tr>)}</tbody></table></div>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Revenue by service</h3><p>{rangeLabel}</p></div></div>
        {byService.length === 0 ? <Empty title="Nothing invoiced" text="Create a sale to see the split." /> :
          <div className="pie-row"><div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={byService} dataKey="value" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>{byService.map((p, i) => <Cell key={p.name} fill={PIE[i % PIE.length]} />)}</Pie>
            <Tooltip content={<ChartTip />} /></PieChart></ResponsiveContainer></div>
            <ul className="pie-list">{byService.slice(0, 7).map((p, i) => <li key={p.name}><i style={{ background: PIE[i % PIE.length] }} /><span>{p.name}</span><b className="num">{money(p.value)}</b></li>)}</ul></div>}
      </section>

    </div>
  </>;
}
