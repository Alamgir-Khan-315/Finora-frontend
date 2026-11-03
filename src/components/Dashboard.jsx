import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Check } from "lucide-react";
import { money, fmtDate, totalOf, dueText } from "../lib";
import { Status, Button, Empty, Count } from "./ui";

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function monthlyData(allRows) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), paid: 0, unpaid: 0 };
  });
  allRows.forEach(r => {
    if (r.status === "Cancelled") return;
    const m = months.find(x => x.key === `${r.date.getFullYear()}-${r.date.getMonth()}`);
    if (m) m[r.status === "Paid" ? "paid" : "unpaid"] += r.amount;
  });
  return months;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><b>{label}</b>{payload.map(p => <div key={p.dataKey}><i style={{ background: p.color }} />{p.name}<span>{money(p.value)}</span></div>)}</div>;
}

export default function Dashboard({ rows, allRows, rangeLabel, onOpen, onMarkPaid, goSales }) {
  const paid = totalOf(rows, "Paid"), pending = totalOf(rows, "Pending"), overdue = totalOf(rows, "Overdue");
  const billed = paid + pending + overdue;
  const count = s => rows.filter(x => x.status === s).length;
  const chart = useMemo(() => monthlyData(allRows), [allRows]);
  const followUp = useMemo(() => allRows.filter(x => x.status === "Overdue" || x.status === "Pending")
    .sort((a, b) => (b.daysLate - a.daysLate) || ((a.dueDate || 9e15) - (b.dueDate || 9e15))).slice(0, 6), [allRows]);
  const recent = rows.slice(0, 6);

  const cols = [
    ["paid", "Collected", paid, count("Paid"), "invoices paid"],
    ["pending", "Waiting for payment", pending, count("Pending"), "invoices not yet due"],
    ["overdue", "Overdue", overdue, count("Overdue"), "past their due date"]
  ];

  return <>
    <section className="panel hero">
      <div className="hero-top">
        <div>
          <div className="hero-label">Billed · {rangeLabel}</div>
          <div className="hero-amount"><Count value={billed} format={money} /></div>
          <div className="hero-sub">{rows.filter(x => x.status !== "Cancelled").length} invoices issued</div>
        </div>
        <div className="hero-rate"><b><Count value={pct(paid, billed)} format={v => `${Math.round(v)}%`} ms={1100} /></b><span>collected so far</span></div>
      </div>
      <div className="split-bar" role="img" aria-label={`Collected ${pct(paid, billed)}%, waiting ${pct(pending, billed)}%, overdue ${pct(overdue, billed)}%`}>
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

    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>Sales by month</h3><p>Last 6 months, by invoice date</p></div>
          <div className="legend"><span><i className="seg-paid" />Paid</span><span><i className="seg-pending" />Not paid yet</span></div></div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(20,26,36,.04)" }} />
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
              <span className={r.daysLate ? "late" : ""}>{r.id} · {dueText(r)}</span>
            </button>
            <b className="num">{money(r.amount)}</b>
            <Button kind="ghost" onClick={() => onMarkPaid(r)} title="Mark as paid"><Check size={15} />Paid</Button>
          </li>)}</ul>}
      </section>
    </div>

    <section className="panel">
      <div className="panel-head"><div><h3>Latest invoices</h3><p>{rangeLabel}</p></div><Button kind="ghost" onClick={goSales}>See all sales</Button></div>
      {recent.length === 0 ? <Empty title="No invoices in this period" text="Create a sale to see it here." /> :
        <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th className="r">Amount</th><th>Status</th></tr></thead>
          <tbody>{recent.map(r => <tr key={r.id} className="clickable" onClick={() => onOpen(r)}>
            <td><b>{r.id}</b></td><td>{r.customer}<small>{r.service}</small></td><td>{fmtDate(r.date)}</td><td className="r num"><b>{money(r.amount)}</b></td><td><Status value={r.status} /></td>
          </tr>)}</tbody></table></div>}
    </section>
  </>;
}
