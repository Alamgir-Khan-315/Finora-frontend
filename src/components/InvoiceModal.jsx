import React, { useState } from "react";
import { Download, Check, Ban, Trash2, Image as ImageIcon, Pencil, Share2, Wallet, X, BellRing } from "lucide-react";
import { money, fmtDate, isValidPhone, prettyPhone, isOpen, siteOf, toInputDate, docLabels } from "../lib";
import { sendInvoiceOnWhatsApp, shareInvoicePicture, canSharePicture, downloadInvoiceImage } from "../whatsapp";
import { downloadInvoicePdf } from "../pdf";
import { Modal, Button, Status } from "./ui";
import Logo from "./Logo";

const WhatsAppIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>;

export default function InvoiceModal({ invoice: inv, company, onClose, onMarkPaid, onCancel, onDelete, onSavePhone, onAddPayment, onRemovePayment, notice, onSendNotice, onDismissNotice, canEdit = true, canDelete = true, notify }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const L = docLabels(inv), isBill = inv.kind === "bill";
  const open = isOpen(inv);
  const due = open ? inv.balance : 0;
  const [pay, setPay] = useState({ amount: "", method: "Cash", date: toInputDate(), note: "" });
  const [paying, setPaying] = useState(false);
  const payAmount = Number(pay.amount) || 0;
  const submitPayment = async e => {
    e.preventDefault();
    if (!(payAmount > 0)) return notify("Enter the amount received.", true);
    if (payAmount > inv.balance + 0.001) return notify(`That is more than the remaining ${money(inv.balance)}.`, true);
    setPaying(true);
    try { await onAddPayment(inv, { amount: payAmount, method: pay.method, date: pay.date, note: pay.note }); setPay(p => ({ ...p, amount: "", note: "" })); }
    finally { setPaying(false); }
  };

  const [phone, setPhone] = useState(inv.customerPhone || "");
  const [editPhone, setEditPhone] = useState(!inv.customerPhone);
  const [busy, setBusy] = useState(false);
  const savePhone = async () => {
    if (phone.trim() && !isValidPhone(phone)) return notify("WhatsApp number looks wrong. Use e.g. 0300 1234567 or +92 300 1234567.", true);
    await onSavePhone(inv, phone.trim()); setEditPhone(false);
  };
  const share = async () => {
    setBusy(true);
    try { const msg = await shareInvoicePicture({ ...inv, customerPhone: editPhone ? phone : inv.customerPhone }, company); if (msg) notify(msg); }
    catch (e) { notify(e.message, true); }
    finally { setBusy(false); }
  };
  const whatsapp = async () => {
    if (editPhone && phone.trim() && isValidPhone(phone) && phone.trim() !== inv.customerPhone) { try { await onSavePhone(inv, phone.trim()); setEditPhone(false); } catch {} }
    setBusy(true);
    try { const msg = await sendInvoiceOnWhatsApp({ ...inv, customerPhone: editPhone ? phone : inv.customerPhone }, company); if (msg) notify(msg); }
    catch (e) { notify(e.message, true); }
    finally { setBusy(false); }
  };
  const picture = async () => { try { await downloadInvoiceImage(inv, company); notify(`${inv.id}.png downloaded`); } catch (e) { notify(e.message, true); } };
  const download = async () => { try { await downloadInvoicePdf(inv, company); notify(`${inv.id}.pdf downloaded`); } catch (e) { notify(e.message, true); } };

  return <Modal wide title={isBill ? "Payment slip" : "Invoice"} subtitle={`${inv.id} · ${inv.customer}`} onClose={onClose}
    actions={<>
      <div className="modal-actions-left">
        {confirmDelete
          ? <><span className="confirm-text">Delete this permanently?</span><Button kind="danger" onClick={() => onDelete(inv)}>Yes, delete</Button><Button kind="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button></>
          : <>{canDelete && <Button kind="ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={15} />Delete</Button>}
            {canEdit && inv.status !== "Cancelled" && inv.status !== "Paid" && <Button kind="ghost" onClick={() => onCancel(inv)}><Ban size={15} />{isBill ? "Cancel" : "Cancel invoice"}</Button>}</>}
      </div>
      {open && canEdit && <Button kind="outline" onClick={() => onMarkPaid(inv)} title="Record the whole remaining amount as received"><Check size={15} />{inv.paidAmount > 0 ? "Mark rest as paid" : "Mark as paid"}</Button>}
      <Button kind="outline" onClick={picture} title="Download the invoice as a picture"><ImageIcon size={15} /><span className="btn-text">Picture</span></Button>
      <Button kind="outline" onClick={download}><Download size={15} /><span className="btn-text">PDF</span></Button>
      {canSharePicture() && <Button kind="outline" onClick={share} disabled={busy} title="Share picture + message through the share sheet (you choose the chat)"><Share2 size={15} /><span className="btn-text">Share</span></Button>}
      <Button kind="whatsapp" onClick={whatsapp} disabled={busy} title="Open this client's WhatsApp chat with the message and the invoice picture copied"><WhatsAppIcon />{busy ? "Preparing…" : "WhatsApp"}</Button>
    </>}>
    <div className="wa-bar">
      <WhatsAppIcon />
      {editPhone
        ? <><input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Client's WhatsApp number, e.g. 0300 1234567" aria-label="Client WhatsApp number" onKeyDown={e => e.key === "Enter" && savePhone()} />
            <Button kind="outline" onClick={savePhone}>Save number</Button>{inv.customerPhone && <Button kind="ghost" onClick={() => { setPhone(inv.customerPhone); setEditPhone(false); }}>Cancel</Button>}</>
        : <><span><b>{inv.customer}</b> · {prettyPhone(inv.customerPhone)}</span><Button kind="ghost" onClick={() => setEditPhone(true)}><Pencil size={14} />Change</Button></>}
    </div>

    {notice && notice.id === inv.id && <div className="notice-bar" role="status">
      <BellRing size={17} />
      <span><b>{isBill ? "Person" : "Customer"} not notified automatically.</b> {notice.reason} Send the update yourself, the message is ready.</span>
      <Button kind="whatsapp" onClick={() => onSendNotice(notice)}><WhatsAppIcon />Send on WhatsApp</Button>
      <button className="icon-btn" onClick={onDismissNotice} aria-label="Dismiss"><X size={16} /></button>
    </div>}

    {inv.status !== "Cancelled" && (open || inv.payments.length > 0) && <section className="pay-panel">
      <div className="pay-head">
        <div><Wallet size={17} /><b>Payments</b></div>
        <span className="num">Received <b>{money(inv.paidAmount)}</b> of {money(inv.amount)}{inv.balance > 0 ? <> · <em>Remaining {money(inv.balance)}</em></> : <> · <em className="done">Paid in full</em></>}</span>
      </div>
      <div className="meter pay-meter"><i style={{ width: `${Math.min(100, inv.amount ? (inv.paidAmount / inv.amount) * 100 : 0)}%` }} /></div>
      {open && canEdit && <form className="pay-form" onSubmit={submitPayment}>
        <label>{isBill ? "Amount paid" : "Amount received"}<input type="number" min="0" step="any" inputMode="decimal" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} placeholder={`up to ${Math.round(inv.balance)}`} /></label>
        <label>Method<select value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })}><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Online</option><option>Cheque</option></select></label>
        <label>Date<input type="date" value={pay.date} max={toInputDate()} onChange={e => setPay({ ...pay, date: e.target.value })} /></label>
        <label>Note <em>optional</em><input value={pay.note} onChange={e => setPay({ ...pay, note: e.target.value })} placeholder="e.g. 2nd instalment" /></label>
        <div className="pay-actions">
          <Button type="button" kind="ghost" onClick={() => setPay(p => ({ ...p, amount: String(inv.balance) }))}>Full remaining</Button>
          <Button type="submit" disabled={paying}><Check size={15} />{paying ? "Saving…" : "Record payment"}</Button>
        </div>
      </form>}
      {inv.payments.length > 0 && <ul className="pay-list">{inv.payments.map(p => <li key={p.id}>
        <span>{fmtDate(p.date)}</span><span>{p.method}{p.note ? ` · ${p.note}` : ""}</span><b className="num">{money(p.amount)}</b>
        {canEdit && <button className="icon-btn" title="Remove this payment (entered by mistake)" aria-label="Remove payment" onClick={() => { if (window.confirm(`Remove the ${money(p.amount)} payment?`)) onRemovePayment(inv, p.id); }}><Trash2 size={14} /></button>}
      </li>)}</ul>}
      <p className="pay-note">Each payment is saved to the database and {isBill ? "the person you pay" : "the customer"} gets a WhatsApp update.</p>
    </section>}
    <article className="paper">
      <header className="paper-head">
        <div className="paper-brand"><Logo size={34} /><div><b>{company}</b><small>{L.sub}</small></div></div>
        <div className="paper-title"><h3>{L.title}</h3><span>{inv.id}</span></div>
      </header>

      <div className="paper-meta">
        <div><small>Issue date</small><b>{fmtDate(inv.date)}</b></div>
        <div><small>Due date</small><b>{fmtDate(inv.dueDate)}</b></div>
        <div><small>Payment method</small><b>{inv.paidAmount > 0 ? (inv.payments.length > 1 ? "Multiple payments" : inv.method) : L.method}</b></div>
        <div><small>Status</small><Status value={inv.status} /></div>
      </div>

      <div className="paper-bill"><small>{L.party}</small><b>{inv.customer}</b>{inv.customerEmail && <span style={{ display: "block" }}>{inv.customerEmail}</span>}{inv.customerPhone && <span style={{ display: "block" }}>WhatsApp: {prettyPhone(inv.customerPhone)}</span>}{siteOf(inv) && <span style={{ display: "block" }}>Site: {siteOf(inv)}</span>}</div>

      <table className="paper-lines">
        <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
        <tbody><tr><td><b>{inv.service}</b></td><td className="r">1</td><td className="r num">{money(inv.amount)}</td></tr></tbody>
      </table>

      <div className="paper-total">
        <div><span>Subtotal</span><b className="num">{money(inv.amount)}</b></div>
        {open && inv.paidAmount > 0 && <div><span>{L.received}</span><b className="num">− {money(inv.paidAmount)}</b></div>}
        <div className="grand"><span>{open ? L.due : inv.status === "Paid" ? L.paid : "Cancelled"}</span><b className="num">{money(due || inv.amount)}</b></div>
      </div>

      {inv.notes && <p className="paper-notes"><small>Notes</small>{inv.notes}</p>}
      <footer className="paper-foot">{isBill ? "Thank you." : "Thank you for your business."}</footer>
      {inv.status === "Paid" && <div className="stamp">Paid</div>}
      {open && inv.paidAmount > 0 && <div className="stamp partial">Partial</div>}
    </article>
  </Modal>;
}
