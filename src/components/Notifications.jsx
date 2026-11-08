import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { money, dueText } from "../lib";

// Bell with in-app alerts: overdue / soon-due invoices and budgets near or over their limit.
export default function Notifications({ invoices, budgets, onOpenInvoice, goExpenses }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);
  const soon = r => r.status === "Pending" && r.dueDate && (r.dueDate - Date.now()) / 864e5 <= 3;
  const items = [
    ...invoices.filter(r => r.status === "Overdue").map(r => ({ key: r.id, tone: "bad", title: `${r.id} is overdue`, text: `${r.customer} · ${money(r.amount)} · ${dueText(r)}`, go: () => onOpenInvoice(r) })),
    ...invoices.filter(soon).map(r => ({ key: r.id, tone: "warn", title: `${r.id} due soon`, text: `${r.customer} · ${money(r.amount)} · ${dueText(r)}`, go: () => onOpenInvoice(r) })),
    ...budgets.filter(b => b.level === "over" || b.level === "warn").map(b => ({ key: "b" + b.category, tone: b.level === "over" ? "bad" : "warn",
      title: b.level === "over" ? `${b.category} budget exceeded` : `${b.category} budget at ${Math.round(b.pct * 100)}%`, text: `${money(b.spent)} of ${money(b.limit)} this month`, go: goExpenses }))
  ];
  return <div className="bell" ref={ref}>
    <button className="icon-btn" onClick={() => setOpen(o => !o)} aria-label={`Alerts (${items.length})`} aria-expanded={open}><Bell size={17} />{items.length > 0 && <span className="bell-n">{items.length > 9 ? "9+" : items.length}</span>}</button>
    {open && <div className="bell-pop" role="dialog" aria-label="Alerts">
      <b>Alerts</b>
      {items.length === 0 ? <p className="hint">All clear. No overdue invoices or budget warnings.</p> :
        <ul>{items.slice(0, 12).map(i => <li key={i.key}><button className={`alert-${i.tone}`} onClick={() => { setOpen(false); i.go(); }}><b>{i.title}</b><span>{i.text}</span></button></li>)}</ul>}
    </div>}
  </div>;
}
