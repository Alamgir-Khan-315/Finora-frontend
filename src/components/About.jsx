import React from "react";
import { ReceiptText, Wallet, Users, FileSpreadsheet, MessageCircle, TrendingUp, FolderOpen, Database } from "lucide-react";
import Logo from "./Logo";

const FEATURES = [
  [ReceiptText, "Sales & invoices", "Create a sale and its invoice is ready at once. Preview it, download the PDF or share it as a picture."],
  [MessageCircle, "Part payments & WhatsApp", "Take payments in parts. Your customer gets a WhatsApp update, with the message ready to send."],
  [Users, "Customers", "Everyone you sell to, built automatically from your sales, and who still owes you."],
  [FolderOpen, "Expense profiles", "Every category is a profile (Rent, Labour…). Create your own for a person or a site and see all its spending."],
  [Wallet, "Bills to pay", "Money you owe to employees and sellers, paid in parts, with a payment slip and WhatsApp updates."],
  [TrendingUp, "Profit & loss", "Month-by-month income, expenses and profit for the year, with a chart."],
  [FileSpreadsheet, "Excel & PDF", "Download sales, customers, expenses and profit & loss as neat Excel sheets, and invoices as PDF."]
];

export default function About({ company }) {
  return <>
    <section className="panel about-hero">
      <Logo size={64} />
      <div><h3>Finora</h3><p>A simple finance and business manager for <b>{company}</b>: sales, invoices, customers, expenses and profit in one place, on your phone or computer.</p></div>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>What you can do</h3><p>Everything below is already inside the app.</p></div></div>
      <div className="about-grid">{FEATURES.map(([Icon, title, text]) => <div key={title} className="about-card"><span className="about-icon"><Icon size={19} /></span><b>{title}</b><p>{text}</p></div>)}</div>
    </section>
    <section className="panel about-data">
      <span className="about-icon"><Database size={19} /></span>
      <div><h3>Your data</h3><p>Sales, expenses, bills and settings are saved in your own database, so you see the same numbers on every device. Nothing is kept only in the browser.</p></div>
    </section>
  </>;
}
