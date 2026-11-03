import React, { useMemo, useState } from "react";
import { Search, Eye, Check, Download, Plus } from "lucide-react";
import { money, fmtDate, STATUSES, dueText, toCsv, downloadText } from "../lib";
import { Status, Button, Empty } from "./ui";

export default function Sales({ rows, rangeLabel, onOpen, onMarkPaid, onAdd, initialQuery = "" }) {
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState(initialQuery);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s, rows.filter(x => x.status === s).length])), [rows]);
  const shown = useMemo(() => rows.filter(x => (tab === "All" || x.status === tab) &&
    [x.id, x.customer, x.service, x.status].join(" ").toLowerCase().includes(q.trim().toLowerCase())), [rows, tab, q]);

  return <section className="panel">
    <div className="toolbar">
      <div className="tabs" role="tablist">
        {["All", ...STATUSES].map(s => <button key={s} role="tab" aria-selected={tab === s} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>
          {s}<span>{s === "All" ? rows.length : counts[s]}</span></button>)}
      </div>
      <div className="toolbar-right">
        <label className="search"><Search size={16} /><input placeholder="Search invoice, customer, service" value={q} onChange={e => setQ(e.target.value)} /></label>
        <Button kind="outline" onClick={() => downloadText(`sales-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(shown))} disabled={!shown.length}><Download size={15} />Export CSV</Button>
      </div>
    </div>
    <div className="subline"><span>{shown.length} {shown.length === 1 ? "invoice" : "invoices"} · {rangeLabel}</span><b className="num">Total {money(shown.filter(x => x.status !== "Cancelled").reduce((a, x) => a + x.amount, 0))}</b></div>

    {shown.length === 0 ? <Empty title={rows.length ? "No invoices match" : "No sales yet"} text={rows.length ? "Try a different status or search." : "Create your first sale and its invoice is ready instantly."}
      action={!rows.length && <Button onClick={onAdd}><Plus size={16} />New sale</Button>} /> :
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
              {(r.status === "Pending" || r.status === "Overdue") && <Button kind="ghost" onClick={() => onMarkPaid(r)} title="Mark as paid"><Check size={15} />Paid</Button>}
              <Button kind="outline" onClick={() => onOpen(r)}><Eye size={15} />Invoice</Button>
            </div>
          </td>
        </tr>)}</tbody></table></div>}
  </section>;
}
