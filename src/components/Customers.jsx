import React, { useMemo } from "react";
import { money, fmtDate, waNumber, prettyPhone } from "../lib";
import { Empty } from "./ui";

export default function Customers({ rows, onFilter }) {
  const customers = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (r.status === "Cancelled") return;
      const c = map.get(r.customer) || { name: r.customer, email: r.customerEmail, phone: r.customerPhone, count: 0, billed: 0, paid: 0, owing: 0, last: r.date };
      c.count++; c.billed += r.amount;
      if (r.status === "Paid") c.paid += r.amount; else c.owing += r.amount;
      if (r.date > c.last) c.last = r.date;
      if (!c.email && r.customerEmail) c.email = r.customerEmail;
      if (!c.phone && r.customerPhone) c.phone = r.customerPhone;
      map.set(r.customer, c);
    });
    return [...map.values()].sort((a, b) => b.owing - a.owing || b.billed - a.billed);
  }, [rows]);

  if (!customers.length) return <section className="panel"><Empty title="No customers yet" text="Customers appear here automatically when you create a sale." /></section>;
  return <section className="panel">
    <div className="panel-head"><div><h3>Customers</h3><p>Built from your sales. Customers who owe you are listed first.</p></div></div>
    <div className="table-wrap"><table>
      <thead><tr><th>Customer</th><th className="r">Invoices</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Still owes</th><th>Last invoice</th></tr></thead>
      <tbody>{customers.map(c => <tr key={c.name} className="clickable" onClick={() => onFilter(c.name)}>
        <td><div className="who"><span className="avatar">{c.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span><div><b>{c.name}</b><small>{c.email || "No email"}</small>{c.phone && <small><a className="wa-link" href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{prettyPhone(c.phone)}</a></small>}</div></div></td>
        <td className="r num">{c.count}</td><td className="r num">{money(c.billed)}</td><td className="r num">{money(c.paid)}</td>
        <td className={`r num ${c.owing ? "owes" : ""}`}><b>{c.owing ? money(c.owing) : "—"}</b></td><td>{fmtDate(c.last)}</td>
      </tr>)}</tbody></table></div>
  </section>;
}
