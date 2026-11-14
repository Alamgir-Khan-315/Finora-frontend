import React, { useState } from "react";
import { Save } from "lucide-react";
import { toInputDate, isValidPhone, money } from "../lib";
import { Modal, Button } from "./ui";

export default function SaleForm({ services, customers, onClose, onSave }) {
  const due = new Date(); due.setDate(due.getDate() + 14);
  const [f, setF] = useState({ customer: "", customerEmail: "", customerPhone: "", house: "", address: "", service: "", amount: "", date: toInputDate(), dueDate: toInputDate(due), paidNow: "", method: "Cash", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const total = Number(f.amount) || 0, paid = Number(f.paidNow) || 0;

  const pickCustomer = v => {
    set("customer", v);
    const known = customers.find(c => c.name.toLowerCase() === v.trim().toLowerCase());
    if (known) setF(x => ({ ...x, customer: v, customerEmail: x.customerEmail || known.email || "", customerPhone: x.customerPhone || known.phone || "", house: x.house || known.house || "", address: x.address || known.address || "" }));
  };
  const submit = async e => {
    e.preventDefault(); setErr("");
    if (!f.customer.trim()) return setErr("Enter the customer name.");
    if (f.customerPhone.trim() && !isValidPhone(f.customerPhone)) return setErr("WhatsApp number looks wrong. Use e.g. 0300 1234567 or +92 300 1234567.");
    if (!f.house.trim()) return setErr("Enter the house / plot number.");
    if (!f.address.trim()) return setErr("Enter the address.");
    if (!f.service.trim()) return setErr("Enter the service sold.");
    if (!(total > 0)) return setErr("Enter an amount greater than zero.");
    if (paid < 0) return setErr("Amount received cannot be negative.");
    if (paid > total) return setErr("Amount received cannot be more than the invoice amount.");
    setBusy(true);
    try { await onSave({ ...f, amount: total, paidNow: paid, status: paid >= total ? "Paid" : "Pending", method: paid > 0 ? f.method : "Not recorded" }); }
    catch (ex) { setErr(ex.message || "Could not save the sale."); setBusy(false); }
  };

  return <Modal title="New sale" subtitle="The invoice number is created automatically." onClose={onClose}
    actions={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button form="sale-form" type="submit" disabled={busy}><Save size={15} />{busy ? "Saving…" : "Save sale"}</Button></>}>
    <form id="sale-form" className="form" onSubmit={submit}>
      <label>Customer<input list="cust-list" value={f.customer} onChange={e => pickCustomer(e.target.value)} placeholder="e.g. Vertex Studio" autoFocus /></label>
      <datalist id="cust-list">{customers.map(c => <option key={c.name} value={c.name} />)}</datalist>
      <label><span>WhatsApp number <em>updates are sent here</em></span><input type="tel" inputMode="tel" value={f.customerPhone} onChange={e => set("customerPhone", e.target.value)} placeholder="0300 1234567" /></label>
      <label>House / plot no.<input value={f.house} onChange={e => set("house", e.target.value)} placeholder="e.g. House 12-B" /></label>
      <label>Address<input value={f.address} onChange={e => set("address", e.target.value)} placeholder="e.g. Street 4, DHA Phase 6, Karachi" /></label>
      <label className="span-2"><span>Customer email <em>optional</em></span><input type="email" value={f.customerEmail} onChange={e => set("customerEmail", e.target.value)} placeholder="accounts@company.com" /></label>
      <label>Service sold<input list="svc-list" value={f.service} onChange={e => set("service", e.target.value)} placeholder="e.g. Boundary wall construction" /></label>
      <datalist id="svc-list">{services.map(s => <option key={s} value={s} />)}</datalist>
      <label>Amount (PKR)<input type="number" min="0" inputMode="decimal" value={f.amount} onChange={e => set("amount", e.target.value)} placeholder="0" /></label>
      <label>Issue date<input type="date" value={f.date} onChange={e => set("date", e.target.value)} /></label>
      <label>Due date<input type="date" value={f.dueDate} min={f.date} onChange={e => set("dueDate", e.target.value)} /></label>
      <label><span>Received now <em>optional, part or full</em></span><input type="number" min="0" inputMode="decimal" value={f.paidNow} onChange={e => set("paidNow", e.target.value)} placeholder="0" /></label>
      {paid > 0
        ? <label>Paid by<select value={f.method} onChange={e => set("method", e.target.value)}><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Online</option><option>Cheque</option></select></label>
        : <div />}
      {total > 0 && <div className="pay-hint span-2">{paid >= total ? "Whole amount received: the invoice will be marked Paid." : paid > 0 ? `${money(paid)} received, ${money(total - paid)} remaining. The invoice will be marked Partial.` : "Nothing received yet: the invoice will be Pending. You can record payments later, in parts."}</div>}
      <label className="span-2"><span>Notes <em>optional, printed on the invoice</em></span><textarea rows="2" value={f.notes} onChange={e => set("notes", e.target.value)} /></label>
      {err && <div className="form-error span-2" role="alert">{err}</div>}
    </form>
  </Modal>;
}
