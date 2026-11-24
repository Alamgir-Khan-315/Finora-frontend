import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { money, fmtDate, waNumber, prettyPhone } from "../lib";
import { customerList, exportCustomers, exportCustomer } from "../exports";
import { Empty, Button } from "./ui";

export default function Customers({ rows, onFilter, company = "Finora Services", notify }) {
  const customers = useMemo(() => customerList(rows), [rows]);
  const fail = () => notify?.("Could not create the Excel file.", true);

  if (!customers.length) return <section className="panel"><Empty title="No customers yet" text="Customers appear here automatically when you create a sale." /></section>;
  return <section className="panel">
    <div className="panel-head"><div><h3>Customers</h3><p>Built from your sales. Customers who owe you are listed first.</p></div>
      <div className="toolbar-right"><Button kind="outline" onClick={() => exportCustomers({ customers, business: company }).catch(fail)}><Download size={15} />Export Excel</Button></div></div>
    <div className="table-wrap"><table>
      <thead><tr><th>Customer</th><th className="r">Invoices</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Still owes</th><th>Last invoice</th><th className="r">Excel</th></tr></thead>
      <tbody>{customers.map(c => <tr key={c.name} className="clickable" onClick={() => onFilter(c.name)}>
        <td><div className="who"><span className="avatar">{c.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span><div><b>{c.name}</b><small>{c.email || "No email"}</small>{(c.house || c.address) && <small>{[c.house, c.address].filter(Boolean).join(", ")}</small>}{c.phone && <small><a className="wa-link" href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{prettyPhone(c.phone)}</a></small>}</div></div></td>
        <td className="r num">{c.count}</td><td className="r num">{money(c.billed)}</td><td className="r num">{money(c.paid)}</td>
        <td className={`r num ${c.owing ? "owes" : ""}`}><b>{c.owing ? money(c.owing) : "—"}</b></td><td>{fmtDate(c.last)}</td>
        <td className="r" onClick={e => e.stopPropagation()}><Button kind="ghost" title={`Download ${c.name}'s Excel sheet`} aria-label={`Download ${c.name} Excel sheet`} onClick={() => exportCustomer({ customer: c, invoices: rows.filter(r => r.customer === c.name), business: company }).catch(fail)}><Download size={15} /></Button></td>
      </tr>)}</tbody></table></div>
  </section>;
}
