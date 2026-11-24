import React, { useMemo, useState } from "react";
import { Download, ChevronRight, ArrowLeft, Plus, MessageCircle, Phone, Mail, MapPin, Search } from "lucide-react";
import { money, fmtDate, waNumber, prettyPhone, dueText } from "../lib";
import { customerList, exportCustomers, exportCustomer } from "../exports";
import { profileColor, initialOf } from "../profiles";
import { Empty, Button, Status } from "./ui";

function Avatar({ name, size = 46 }) {
  return <span className="pf-avatar" style={{ background: profileColor(name), width: size, height: size, fontSize: size * 0.38 }}>{initialOf(name)}</span>;
}

// Customers tab: one card per customer. Open one for its own page (same layout as an expense profile) with every invoice.
export default function Customers({ rows, onFilter, onOpen, onNewSale, company = "Finora Services", notify }) {
  const customers = useMemo(() => customerList(rows), [rows]);
  const [open, setOpen] = useState(null), [q, setQ] = useState("");
  const fail = () => notify?.("Could not create the Excel file.", true);

  if (!customers.length) return <section className="panel"><Empty title="No customers yet" text="Customers appear here automatically when you create a sale." /></section>;
  const current = open && customers.find(c => c.name === open);
  if (current) return <CustomerDetail customer={current} invoices={rows.filter(r => r.customer === current.name)} company={company} fail={fail} onBack={() => setOpen(null)} onOpen={onOpen} onNewSale={onNewSale} onFilter={onFilter} />;

  const shown = customers.filter(c => [c.name, c.phone, c.email, c.house, c.address].join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  return <section className="panel">
    <div className="panel-head"><div><h3>Customers</h3><p>Built from your sales. Customers who owe you are listed first. Open one to see all their invoices.</p></div>
      <div className="toolbar-right"><label className="search"><Search size={16} /><input placeholder="Search customers" value={q} onChange={e => setQ(e.target.value)} /></label>
        <Button kind="outline" onClick={() => exportCustomers({ customers, business: company }).catch(fail)}><Download size={15} />Export Excel</Button></div></div>
    {shown.length === 0 ? <Empty title="No customer found" text="Try a different name or number." /> :
      <div className="pf-grid">{shown.map(c => <button key={c.name} className="pf-card" onClick={() => { setOpen(c.name); window.scrollTo(0, 0); }}>
        <Avatar name={c.name} />
        <span className="pf-main"><b>{c.name}</b><small>{c.count} {c.count === 1 ? "invoice" : "invoices"} · {money(c.billed)}</small></span>
        <span className={`pf-total num ${c.owing ? "owes" : ""}`}>{c.owing ? <>{money(c.owing)}<small className="pf-owe">owes</small></> : "Paid up"}</span><ChevronRight size={16} className="pf-go" />
      </button>)}</div>}
  </section>;
}

function CustomerDetail({ customer: c, invoices, company, fail, onBack, onOpen, onNewSale, onFilter }) {
  const [tab, setTab] = useState("all"), [all, setAll] = useState(false);
  const unpaid = invoices.filter(r => r.balance > 0 && r.status !== "Cancelled");
  const list = tab === "all" ? invoices : unpaid, shown = all ? list : list.slice(0, 15);
  const wa = waNumber(c.phone);
  const place = [c.house, c.address].filter(Boolean).join(", ");
  return <div className="pfd">
    <section className="pfd-hero">
      <div className="pfd-top">
        <button className="pfd-back" onClick={onBack} aria-label="Back to all customers"><ArrowLeft size={17} /><span>Customers</span></button>
        {wa && <a className="pfd-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />WhatsApp</a>}
      </div>
      <div className="pfd-id"><Avatar name={c.name} size={60} /><div><h3>{c.name}</h3><p>{c.owing ? `Still owes ${money(c.owing)}` : "All invoices paid"}</p></div></div>
      {(c.phone || c.email || place) && <ul className="pfd-contact">{c.phone && <li><Phone size={13} />{prettyPhone(c.phone)}</li>}{c.email && <li><Mail size={13} />{c.email}</li>}{place && <li><MapPin size={13} />{place}</li>}</ul>}
    </section>
    <div className="pfd-stats">
      <div><small>Total billed</small><b className="num">{money(c.billed)}</b></div>
      <div><small>Paid</small><b className="num">{money(c.paid)}</b></div>
      <div><small>Still owes</small><b className={`num ${c.owing ? "owes" : ""}`}>{c.owing ? money(c.owing) : "—"}</b></div>
      <div><small>Invoices</small><b className="num">{c.count}</b></div>
    </div>
    <div className="pfd-actions">
      <Button onClick={onNewSale}><Plus size={16} />New sale</Button>
      <Button kind="outline" onClick={() => exportCustomer({ customer: c, invoices, business: company }).catch(fail)}><Download size={16} />Download Excel</Button>
    </div>
    <section className="panel pfd-list">
      <div className="panel-head"><div><h3>{tab === "all" ? "Invoices" : "Unpaid invoices"}</h3><p>{list.length} {list.length === 1 ? "invoice" : "invoices"} · last on {fmtDate(c.last)}</p></div>
        <Button kind="ghost" onClick={() => onFilter(c.name)}>Open in Sales<ChevronRight size={15} /></Button></div>
      <div className="segmented pfd-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => { setTab("all"); setAll(false); }}>All ({invoices.length})</button>
        <button role="tab" aria-selected={tab === "unpaid"} className={tab === "unpaid" ? "on" : ""} onClick={() => { setTab("unpaid"); setAll(false); }}>Unpaid ({unpaid.length})</button>
      </div>
      {list.length === 0 ? <Empty title={tab === "all" ? "No invoices" : "Nothing unpaid"} text={tab === "all" ? "This customer has no invoices yet." : `${c.name} has paid everything.`} /> :
        <ul className="pfd-items">{shown.map(r => <li key={r.id} className="tap" onClick={() => onOpen(r)}>
          <span className="pfd-date"><b>{r.date.getDate()}</b>{r.date.toLocaleString("en-US", { month: "short" })}</span>
          <span className="pfd-main"><b>{r.id} · {r.service}</b><small className={r.daysLate ? "late" : ""}>{dueText(r) || (r.paidAmount > 0 && r.balance > 0 ? `Received ${money(r.paidAmount)}` : "")}</small></span>
          <span className="pfd-amt num">{money(r.amount)}<Status value={r.status} /></span>
        </li>)}</ul>}
      {list.length > 15 && <div className="view-all"><Button kind="ghost" onClick={() => setAll(v => !v)}>{all ? "Show latest 15" : `View all ${list.length} invoices`}</Button></div>}
    </section>
  </div>;
}
