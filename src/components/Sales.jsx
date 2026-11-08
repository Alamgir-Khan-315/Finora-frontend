import React, { useMemo, useState } from "react";
import { Search, Eye, Check, Download, Plus } from "lucide-react";
import { money, fmtDate, STATUSES, dueText, toCsv, downloadText, RANGES } from "../lib";
import { Status, Button, Empty, Segmented } from "./ui";

export default function Sales({ rows, range, setRange, onOpen, onMarkPaid, onAdd, initialQuery = "" }) {
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState(initialQuery);
  const [method, setMethod] = useState("All");
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const methods = useMemo(() => [...new Set(rows.map(r => r.method).filter(m => m && m !== "Not recorded"))].sort(), [rows]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s, rows.filter(x => x.status === s).length])), [rows]);
  const shown = useMemo(() => rows.filter(x => (tab === "All" || x.status === tab) &&
    (method === "All" || x.method === method) &&
    (!from || x.date >= new Date(from + "T00:00:00")) && (!to || x.date <= new Date(to + "T23:59:59")) &&
    [x.id, x.customer, x.service, x.status].join(" ").toLowerCase().includes(q.trim().toLowerCase())), [rows, tab, q, method, from, to]);

  const rangeLabel = RANGES.find(r => r[0] === range)[1];
  return <><div className="toolbar dash-bar"><Segmented label="Period" value={range} onChange={setRange} options={[["all", "All data"], ...RANGES.filter(r => r[0] !== "all")]} /></div>
  <section className="panel">
    <div className="toolbar">
      <div className="tabs" role="tablist">
        {["All", ...STATUSES].map(s => <button key={s} role="tab" aria-selected={tab === s} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>
          {s}<span>{s === "All" ? rows.length : counts[s]}</span></button>)}
      </div>
      <div className="toolbar-right">
        <label className="filter"><span>From</span><input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
        <label className="filter"><span>To</span><input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <label className="filter"><span>Method</span><select value={method} onChange={e => setMethod(e.target.value)}><option>All</option>{methods.map(m => <option key={m}>{m}</option>)}</select></label>
        <label className="search"><Search size={16} /><input placeholder="Search invoice, customer, service" value={q} onChange={e => setQ(e.target.value)} /></label>
        <Button kind="outline" onClick={() => downloadText(`sales-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(shown))} disabled={!shown.length}><Download size={15} />Export CSV</Button>
      </div>
    </div>
    <div className="subline"><span>{shown.length} {shown.length === 1 ? "invoice" : "invoices"} · {rangeLabel}</span><b className="num">Total {money(shown.filter(x => x.status !== "Cancelled").reduce((a, x) => a + x.amount, 0))}</b></div>

    {shown.length === 0 ? <Empty title={rows.length ? "No invoices match" : "No sales yet"} text={rows.length ? "Try a different status or search." : "Create your first sale and its invoice is ready instantly."}
      action={!rows.length && onAdd && <Button onClick={onAdd}><Plus size={16} />New sale</Button>} /> :
      <div className="table-wrap"><table>
        <thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th className="r">Amount</th><th>Status</th><th className="r">Actions</th></tr></thead>
        <tbody>{shown.map(r => <tr key={r.id} className="clickable" onClick={() => onOpen(r)}>
          <td><b>{r.id}</b></td>
          <td>{r.customer}<small>{r.service}</small></td>
          <td>{fmtDate(r.date)}</td>
          <td>{r.dueDate ? fmtDate(r.dueDate) : "—"}{dueText(r) && <small className={r.daysLate ? "late" : ""}>{dueText(r)}</small>}</td>
          <td className="r num"><b>{money(r.amount)}</b></td>
          <td><Status value={r.status} /></td>
          <td className="r" onClick={e => e.stopPropagation()}>
            <div className="row-actions">
              {onMarkPaid && (r.status === "Pending" || r.status === "Overdue") && <Button kind="ghost" onClick={() => onMarkPaid(r)} title="Mark as paid"><Check size={15} />Paid</Button>}
              <Button kind="outline" onClick={() => onOpen(r)}><Eye size={15} />Invoice</Button>
            </div>
          </td>
        </tr>)}</tbody></table></div>}
  </section></>;
}
