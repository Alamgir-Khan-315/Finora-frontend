import React from "react";
import { ReceiptText, Users, Wallet, MessageCircle, LayoutDashboard, Smartphone, Database, FileSpreadsheet } from "lucide-react";
import Logo from "./Logo";

const FEATURES = [
  [ReceiptText, "Sales & invoices", "Make an invoice for every sale and download it as a PDF or print it. Customers can pay in parts: the status moves from Pending to Partial to Paid by itself."],
  [Users, "Customers", "Every customer has a profile with their invoices, totals and what they still owe. Send a payment reminder in one tap."],
  [Wallet, "Expenses & bills", "Record expenses under profiles like Rent, Home or Site A, set monthly budgets with alerts, and track bills you owe to employees or sellers."],
  [MessageCircle, "WhatsApp updates", "After every payment or invoice change, a ready message goes to the customer on WhatsApp, automatically or with one tap."],
  [LayoutDashboard, "Dashboard & reports", "See money received, expenses, net profit and what is still to collect, with charts and a month-by-month profit and loss report."],
  [FileSpreadsheet, "Excel & CSV", "Download customers, expenses and profiles as real Excel files, and reports as CSV."]
];

// "About Finora": what the app is and what it does.
export default function About() {
  return <div className="about-page">
    <section className="profile-head about-hero">
      <span className="about-logo"><Logo size={64} /></span>
      <div className="profile-id"><h2>Finora</h2><p>Sales, invoices, expenses and profit in one place</p></div>
      <p className="contact-pitch">A simple business app for one owner. Write every sale, send the invoice, see who still owes you, and know your profit at the end of the month.</p>
    </section>

    <section className="panel">
      <div className="panel-head"><div><h3>What Finora does</h3><p>Everything you need to run the money side of your business.</p></div></div>
      <ul className="about-features">
        {FEATURES.map(([Icon, title, text]) => <li key={title}><span className="ci"><Icon size={19} /></span><div><b>{title}</b><p>{text}</p></div></li>)}
      </ul>
    </section>

    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>How profit is counted</h3><p>So the numbers always make sense.</p></div></div>
        <ul className="about-points">
          <li><b>Income</b> is counted in the month the money is received, so each part payment counts in its own month.</li>
          <li><b>Expenses</b> are counted in the month they were spent. Payments on bills also count as expenses.</li>
          <li><b>Profit</b> = income − expenses.</li>
        </ul>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Safe and on every device</h3><p>Your data stays with you.</p></div></div>
        <ul className="about-points">
          <li className="with-ic"><Database size={17} /><span>Sales, expenses, budgets and settings are saved in your database, so they are the same on your phone and your computer.</span></li>
          <li className="with-ic"><Smartphone size={17} /><span>Made to work on phones too: a bottom menu, cards instead of tables, and day and night mode.</span></li>
        </ul>
      </section>
    </div>
  </div>;
}
