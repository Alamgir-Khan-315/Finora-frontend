import React, { useMemo, useState } from "react";
import { Download, MessageCircle, Phone, Mail, MapPin, Search, ChevronRight } from "lucide-react";
import { money, fmtDate, waNumber, prettyPhone, siteOf, isOpen, dueText, toInputDate } from "../lib";
import { openChatWithText } from "../whatsapp";
import { downloadXlsx, total } from "../xlsx";
import { Empty, Button, Segmented, Status } from "./ui";
import { Profile, initials } from "./Profile";

const invoiceRows = list => [["Invoice", "Customer", "Date", "Due date", "Service", "House", "Address", "Amount (PKR)", "Received (PKR)", "Remaining (PKR)", "Status", "Method", "Description"],
  ...list.map(r => [r.id, r.customer, r.date, r.dueDate, r.service, r.house, r.address, r.amount, r.paidAmount, r.balance, r.status, r.method, r.notes])];

export default function Customers({ rows, onOpen }) {
  const [sel, setSel] = useState(null), [q, setQ] = useState(""), [tab, setTab] = useState("all");
  const customers = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      const c = map.get(r.customer) || { name: r.customer, email: r.customerEmail, phone: r.customerPhone, house: r.house, address: r.address, count: 0, billed: 0, paid: 0, owing: 0, last: r.date };
      if (r.status !== "Cancelled") { c.count++; c.billed += r.amount; c.paid += r.paidAmount; c.owing += r.balance; }
      if (r.date > c.last) c.last = r.date;
      if (!c.email && r.customerEmail) c.email = r.customerEmail;
      if (!c.phone && r.customerPhone) c.phone = r.customerPhone;
      if (!c.house && r.house) c.house = r.house;
      if (!c.address && r.address) c.address = r.address;
      map.set(r.customer, c);
    });
    return [...map.values()].sort((a, b) => b.owing - a.owing || b.billed - a.billed);
  }, [rows]);

  const allExcel = () => downloadXlsx(`customers-${toInputDate()}`, [
    { name: "Customers", rows: [["Customer", "WhatsApp", "Email", "House", "Address", "Invoices", "Billed (PKR)", "Paid (PKR)", "Still owes (PKR)", "Last invoice"],
      ...customers.map(c => [c.name, c.phone, c.email, c.house, c.address, c.count, c.billed, c.paid, c.owing, c.last]),
      [total("Total"), "", "", "", "", total(customers.reduce((a, c) => a + c.count, 0)), total(customers.reduce((a, c) => a + c.billed, 0)), total(customers.reduce((a, c) => a + c.paid, 0)), total(customers.reduce((a, c) => a + c.owing, 0)), ""]] },
    { name: "All invoices", rows: invoiceRows(rows) }
  ]);

  // ---------- one customer's profile ----------
  if (sel) {
    const c = customers.find(x => x.name === sel);
    if (!c) { setSel(null); return null; }
    const list = rows.filter(r => r.customer === c.name).sort((a, b) => b.date - a.date);
    const shown = list.filter(r => tab === "all" || (tab === "open" && isOpen(r)) || (tab === "paid" && r.status === "Paid"));
    const open = list.filter(isOpen);
    const excel = () => downloadXlsx(`customer-${c.name.replace(/[^\w]+/g, "-")}-${toInputDate()}`, [
      { name: "Summary", rows: [["Customer", c.name], ["WhatsApp", c.phone], ["Email", c.email], ["House", c.house], ["Address", c.address], ["Invoices", c.count], ["Billed (PKR)", c.billed], ["Paid (PKR)", c.paid], ["Still owes (PKR)", c.owing]] },
      { name: "Invoices", rows: [...invoiceRows(list), [total("Total"), "", "", "", "", "", "", total(list.filter(r => r.status !== "Cancelled").reduce((a, r) => a + r.amount, 0)), total(c.paid), total(c.owing), "", "", ""]] },
      { name: "Payments", rows: [["Invoice", "Date", "Amount (PKR)", "Method", "Description"], ...list.flatMap(r => r.payments.map(p => [r.id, p.date, p.amount, p.method, p.note]))] }
    ]);
    const remind = () => openChatWithText(c.phone, [`Hello ${c.name},`, "A friendly reminder about your pending payment:", ...open.map(r => `${r.id}: ${money(r.balance)} left${r.dueDate ? ` (due ${fmtDate(r.dueDate)})` : ""}`), `Total remaining: ${money(c.owing)}`, "Thank you."].join("\n"));
    const site = [c.house, c.address].filter(Boolean).join(", ");
    return <Profile onBack={() => { setSel(null); setTab("all"); }} backLabel="Customers" avatar={initials(c.name)} title={c.name} subtitle={site || "No address saved"}
      chips={<>
        {c.phone && <a className="chip wa" href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />WhatsApp</a>}
        {c.phone && <a className="chip" href={`tel:${c.phone}`}><Phone size={15} />{prettyPhone(c.phone)}</a>}
        {c.email && <a className="chip" href={`mailto:${c.email}`}><Mail size={15} />Email</a>}
        {site && <span className="chip"><MapPin size={15} />{site}</span>}
      </>}
      stats={[["Invoices", c.count], ["Billed", money(c.billed)], ["Paid", money(c.paid), "good"], ["Still owes", c.owing ? money(c.owing) : "—", c.owing ? "bad" : ""]]}
      actions={<><Button onClick={excel}><Download size={15} />Download Excel</Button>{c.phone && open.length > 0 && <Button kind="whatsapp" onClick={remind}><MessageCircle size={15} />Send payment reminder</Button>}</>}>
      <section className="panel">
        <div className="panel-head"><div><h3>Invoices</h3><p>{list.length} {list.length === 1 ? "invoice" : "invoices"} for {c.name}. Tap one to open it.</p></div></div>
        <div className="toolbar"><Segmented label="Show" value={tab} onChange={setTab} options={[["all", `All (${list.length})`], ["open", `To collect (${open.length})`], ["paid", "Paid"]]} /></div>
        {shown.length === 0 ? <Empty title="Nothing here" text="No invoices match this filter." /> :
          <ul className="inv-list">{shown.map(r => <li key={r.id}><button onClick={() => onOpen(r)}>
            <div className="inv-top"><b>{r.id}</b><Status value={r.status} /></div>
            <div className="inv-mid"><span>{r.service}{siteOf(r) ? ` · ${siteOf(r)}` : ""}</span></div>
            <div className="inv-bot"><span>{fmtDate(r.date)}{dueText(r) ? ` · ${dueText(r)}` : ""}</span><b className="num">{money(r.amount)}</b></div>
            {r.paidAmount > 0 && r.balance > 0 && <small className="inv-part">Received {money(r.paidAmount)} · Left {money(r.balance)}</small>}
            <ChevronRight size={18} className="inv-go" />
          </button></li>)}</ul>}
      </section>
    </Profile>;
  }

  // ---------- customer list ----------
  if (!customers.length) return <section className="panel"><Empty title="No customers yet" text="Customers appear here automatically when you create a sale." /></section>;
  const needle = q.trim().toLowerCase();
  const shownList = customers.filter(c => !needle || [c.name, c.phone, c.email, c.house, c.address].join(" ").toLowerCase().includes(needle));
  return <section className="panel">
    <div className="panel-head"><div><h3>Customers</h3><p>Tap a customer to open their profile and invoices. Customers who owe you are listed first.</p></div>
      <div className="toolbar-right"><label className="search"><Search size={16} /><input placeholder="Search name, phone, address" value={q} onChange={e => setQ(e.target.value)} /></label>
        <Button kind="outline" onClick={allExcel}><Download size={15} />Download Excel</Button></div></div>
    {shownList.length === 0 ? <Empty title="No customer matches" text="Try another name or number." /> :
      <ul className="cust-list">{shownList.map(c => <li key={c.name}><button onClick={() => setSel(c.name)}>
        <span className="avatar big">{initials(c.name)}</span>
        <span className="cust-main"><b>{c.name}</b><small>{[c.house, c.address].filter(Boolean).join(", ") || c.email || "No address saved"}</small><small>{c.count} {c.count === 1 ? "invoice" : "invoices"} · last {fmtDate(c.last)}</small></span>
        <span className="cust-money"><b className="num">{money(c.billed)}</b>{c.owing > 0 ? <em className="owes">owes {money(c.owing)}</em> : <em className="clear">all paid</em>}</span>
        <ChevronRight size={18} className="inv-go" />
      </button></li>)}</ul>}
  </section>;
}
