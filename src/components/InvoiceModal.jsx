import React, { useState } from "react";
import { Download, Check, Ban, Trash2 } from "lucide-react";
import { money, fmtDate } from "../lib";
import { downloadInvoicePdf } from "../pdf";
import { Modal, Button, Status } from "./ui";
import Logo from "./Logo";

export default function InvoiceModal({ invoice: inv, company, onClose, onMarkPaid, onCancel, onDelete, canEdit = true, canDelete = true, notify }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = inv.status === "Pending" || inv.status === "Overdue";
  const due = open ? inv.amount : 0;

  const download = () => { downloadInvoicePdf(inv, company); notify(`${inv.id}.pdf downloaded`); };

  return <Modal wide title="Invoice" subtitle={`${inv.id} · ${inv.customer}`} onClose={onClose}
    actions={<>
      <div className="modal-actions-left">
        {confirmDelete
          ? <><span className="confirm-text">Delete this invoice permanently?</span><Button kind="danger" onClick={() => onDelete(inv)}>Yes, delete</Button><Button kind="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button></>
          : <>{canDelete && <Button kind="ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={15} />Delete</Button>}
            {canEdit && inv.status !== "Cancelled" && inv.status !== "Paid" && <Button kind="ghost" onClick={() => onCancel(inv)}><Ban size={15} />Cancel invoice</Button>}</>}
      </div>
      {open && canEdit && <Button kind="outline" onClick={() => onMarkPaid(inv)}><Check size={15} />Mark as paid</Button>}
      <Button onClick={download}><Download size={15} />Download PDF</Button>
    </>}>
    <article className="paper">
      <header className="paper-head">
        <div className="paper-brand"><Logo size={34} /><div><b>{company}</b><small>Sales invoice</small></div></div>
        <div className="paper-title"><h3>INVOICE</h3><span>{inv.id}</span></div>
      </header>

      <div className="paper-meta">
        <div><small>Issue date</small><b>{fmtDate(inv.date)}</b></div>
        <div><small>Due date</small><b>{fmtDate(inv.dueDate)}</b></div>
        <div><small>Payment method</small><b>{inv.status === "Paid" ? inv.method : "Not paid yet"}</b></div>
        <div><small>Status</small><Status value={inv.status} /></div>
      </div>

      <div className="paper-bill"><small>Bill to</small><b>{inv.customer}</b>{inv.customerEmail && <span>{inv.customerEmail}</span>}</div>

      <table className="paper-lines">
        <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
        <tbody><tr><td><b>{inv.service}</b></td><td className="r">1</td><td className="r num">{money(inv.amount)}</td></tr></tbody>
      </table>

      <div className="paper-total">
        <div><span>Subtotal</span><b className="num">{money(inv.amount)}</b></div>
        <div className="grand"><span>{open ? "Amount due" : inv.status === "Paid" ? "Paid in full" : "Cancelled"}</span><b className="num">{money(due || inv.amount)}</b></div>
      </div>

      {inv.notes && <p className="paper-notes"><small>Notes</small>{inv.notes}</p>}
      <footer className="paper-foot">Thank you for your business.</footer>
      {inv.status === "Paid" && <div className="stamp">Paid</div>}
    </article>
  </Modal>;
}
