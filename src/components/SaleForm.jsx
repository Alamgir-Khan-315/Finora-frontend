import React, { useState } from "react";
import { Save } from "lucide-react";
import { toInputDate } from "../lib";
import { Modal, Button } from "./ui";

export default function SaleForm({ services, customers, onClose, onSave }) {
  const due = new Date(); due.setDate(due.getDate() + 14);
  const [f, setF] = useState({ customer: "", customerEmail: "", service: "", amount: "", date: toInputDate(), dueDate: toInputDate(due), status: "Pending", method: "Bank Transfer", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const pickCustomer = v => {
    set("customer", v);
    const known = customers.find(c => c.name.toLowerCase() === v.trim().toLowerCase());
    if (known && !f.customerEmail) set("customerEmail", known.email);
  };
  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.customer.trim()) return setErr("Enter the customer name.");
    if (!f.service.trim()) return setErr("Enter the service sold.");
    if (!(Number(f.amount) > 0)) return setErr("Enter an amount greater than zero.");
    setBusy(true);
    try { await onSave({ ...f, amount: Number(f.amount), method: f.status === "Paid" ? f.method : "Not recorded" }); }
    catch (ex) { setErr(ex.message || "Could not save the sale."); setBusy(false); }
  };

  return <Modal title="New sale" subtitle="The invoice number is created automatically." onClose={onClose}
    actions={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button form="sale-form" type="submit" disabled={busy}><Save size={15} />{busy ? "Saving…" : "Save sale"}</Button></>}>
    <form id="sale-form" className="form" onSubmit={submit}>
      <label>Customer<input list="cust-list" value={f.customer} onChange={e => pickCustomer(e.target.value)} placeholder="e.g. Vertex Studio" autoFocus /></label>
      <datalist id="cust-list">{customers.map(c => <option key={c.name} value={c.name} />)}</datalist>
      <label><span>Customer email <em>optional</em></span><input type="email" value={f.customerEmail} onChange={e => set("customerEmail", e.target.value)} placeholder="accounts@company.com" /></label>
      <label>Service sold<input list="svc-list" value={f.service} onChange={e => set("service", e.target.value)} placeholder="e.g. Website Development" /></label>
      <datalist id="svc-list">{services.map(s => <option key={s} value={s} />)}</datalist>
      <label>Amount (PKR)<input type="number" min="0" inputMode="decimal" value={f.amount} onChange={e => set("amount", e.target.value)} placeholder="0" /></label>
      <label>Issue date<input type="date" value={f.date} onChange={e => set("date", e.target.value)} /></label>
      <label>Due date<input type="date" value={f.dueDate} min={f.date} onChange={e => set("dueDate", e.target.value)} /></label>
      <label>Payment status<select value={f.status} onChange={e => set("status", e.target.value)}><option>Pending</option><option>Paid</option></select></label>
      {f.status === "Paid"
        ? <label>Paid by<select value={f.method} onChange={e => set("method", e.target.value)}><option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Online</option></select></label>
        : <div />}
      <label className="span-2"><span>Notes <em>optional, printed on the invoice</em></span><textarea rows="2" value={f.notes} onChange={e => set("notes", e.target.value)} /></label>
      {err && <div className="form-error span-2" role="alert">{err}</div>}
    </form>
  </Modal>;
}
