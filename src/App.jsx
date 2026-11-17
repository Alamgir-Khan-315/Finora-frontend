import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, ReceiptText, Users, Settings as Cog, Plus, Menu, X, RefreshCw, AlertCircle, CheckCircle2, Sun, Moon, ArrowUpRight, UserRound, Phone, Wallet } from "lucide-react";
import { apiRequest, resolveServer } from "./config";
import { normalize, normalizeBill, billExpenseRows, dateInRange } from "./lib";
import { openChatWithText } from "./whatsapp";
import { Button, Clock } from "./components/ui";
import Dashboard from "./components/Dashboard";
import Sales from "./components/Sales";
import Customers from "./components/Customers";
import InvoiceModal from "./components/InvoiceModal";
import SaleForm from "./components/SaleForm";
import Logo from "./components/Logo";
import Contact from "./components/Contact";
import { CONTACT, CONTACT_TEL } from "./contact";
import Expenses, { budgetStatus, DEFAULT_CATEGORIES } from "./components/Expenses";
import Notifications from "./components/Notifications";
import Settings from "./components/Settings";

const NAV = [["Dashboard", LayoutDashboard], ["Sales & invoices", ReceiptText], ["Customers", Users], ["Expenses", Wallet], ["Contact me", UserRound], ["Settings", Cog]];
const HEAD = {
  "Dashboard": ["Dashboard", "Your sales, money received, expenses and profit at a glance."],
  "Sales & invoices": ["Sales & invoices", "Every sale with its invoice. Open one to preview or download the PDF."],
  "Customers": ["Customers", "Who you sell to and who still owes you."],
  "Expenses": ["Expenses", "Month-by-month income, spending and profit or loss."],
  "Contact me": ["About & contact", "Who made Finora, and how to get a website or software made for your business."],
  "Settings": ["Settings", "Business details shown on your invoices."]
};
// Short names for the phone tab bar (like WhatsApp: icon + small label at the bottom).
const TAB_LABEL = { "Dashboard": "Home", "Sales & invoices": "Sales", "Customers": "Customers", "Expenses": "Expenses", "Contact me": "Contact", "Settings": "Settings" };

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [drawer, setDrawer] = useState(false);
  const [raw, setRaw] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [payables, setPayables] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);   // expense categories = profiles (built-in + your own)
  const [navTick, setNavTick] = useState(0);   // bills you owe to employees / sellers
  const [notice, setNotice] = useState(null);   // WhatsApp update the server could not send by itself
  const [business, setBusiness] = useState({ businessName: "Finora Services", portfolio: "" });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [server, setServer] = useState(null);
  const [dashRange, setDashRange] = useState("month");
  const [salesRange, setSalesRange] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [salesQuery, setSalesQuery] = useState("");
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("finora_theme", theme); } catch {}
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b1020" : "#1c3b6c");
  }, [theme]);

  const notify = useCallback((text, bad = false) => { setToast({ text, bad }); clearTimeout(notify.t); notify.t = setTimeout(() => setToast(null), 3200); }, []);

  // Everything lives in the database: sales, expenses, budgets and business details.
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setServer(await resolveServer(true));
      const [sales, exp, bud, biz, bills, cats] = await Promise.all([apiRequest("/sales"), apiRequest("/expenses"), apiRequest("/budgets"), apiRequest("/settings"), apiRequest("/payables"), apiRequest("/categories")]);
      if (!Array.isArray(sales) || !Array.isArray(exp) || !Array.isArray(bills)) throw new Error("The server returned unexpected data.");
      setRaw(sales); setPayables(bills); if (Array.isArray(cats) && cats.length) setCategories(cats); setExpenses(exp); setBudgets(Object.fromEntries(bud.map(b => [b.category, b.limit]))); setBusiness(biz); setLoaded(true);
    } catch (e) { setError(e.message || "Could not load your data."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const all = useMemo(() => raw.map(normalize).sort((a, b) => b.date - a.date), [raw]);
  const dashRows = useMemo(() => all.filter(r => dateInRange(r.date, dashRange)), [all, dashRange]);
  const salesRows = useMemo(() => all.filter(r => dateInRange(r.date, salesRange)), [all, salesRange]);
  const billRows = useMemo(() => payables.map(normalizeBill).sort((a, b) => b.date - a.date), [payables]);
  // Every payment on a bill is money spent: merge those into the expense list used by reports, budgets and the dashboard.
  const expenseRows = useMemo(() => [...expenses, ...billExpenseRows(billRows)], [expenses, billRows]);
  const open = all.find(r => r.id === openId) || billRows.find(r => r.id === openId) || null;
  const customers = useMemo(() => {
    const map = new Map();   // newest invoice first, so the most recent email/number wins
    all.forEach(r => { const c = map.get(r.customer) || { name: r.customer, email: "", phone: "", house: "", address: "" }; c.email ||= r.customerEmail; c.phone ||= r.customerPhone; c.house ||= r.house; c.address ||= r.address; map.set(r.customer, c); });
    return [...map.values()];
  }, [all]);
  const services = useMemo(() => [...new Set(all.map(r => r.service))].filter(Boolean), [all]);
  const people = useMemo(() => [...new Set(billRows.map(b => b.customer).filter(Boolean))], [billRows]);
  const budgetLevels = useMemo(() => budgetStatus(expenseRows, budgets, categories), [expenseRows, budgets, categories]);

  const replace = useCallback((id, record) => setRaw(list => list.map(r => r.id === id ? record : r)), []);

  // Invoices (money in) and bills (money out) share the same screens, so the handlers pick the right endpoint.
  const isBill = inv => inv.kind === "bill";
  const base = inv => (isBill(inv) ? "/payables" : "/sales");
  const put = (inv, record) => (isBill(inv) ? setPayables(l => l.map(x => x.id === inv.id ? record : x)) : replace(inv.id, record));

  // The server returns the record plus `notification`: the WhatsApp update for the customer / person.
  // If the server could not send it (WhatsApp API not set up), the message is kept ready so one tap opens the chat.
  const applyResult = (inv, result, message) => {
    const { notification, ...record } = result;
    put(inv, record);
    if (notification?.sent) { setNotice(null); notify(`${message}. WhatsApp update sent to ${inv.customer}.`); }
    else if (notification?.to) { setNotice({ id: inv.id, ...notification }); notify(`${message}. Tap “Send on WhatsApp” to tell ${inv.customer}.`); }
    else if (notification) { setNotice(null); notify(`${message}. Add ${inv.customer}'s WhatsApp number to send updates.`); }
    else notify(message);
  };
  const update = async (inv, changes, message) => {
    try { applyResult(inv, await apiRequest(`${base(inv)}/${encodeURIComponent(inv.id)}`, { method: "PATCH", body: JSON.stringify(changes) }), message); }
    catch (e) { notify(`Could not update: ${e.message}`, true); }
  };
  const savePhone = (inv, phone) => update(inv, isBill(inv) ? { payeePhone: phone } : { customerPhone: phone }, phone ? "WhatsApp number saved" : "WhatsApp number removed");
  const markPaid = inv => update(inv, { status: "Paid", method: inv.method !== "Not recorded" ? inv.method : (isBill(inv) ? "Cash" : "Bank Transfer") }, isBill(inv) ? "Bill marked as paid" : `${inv.id} marked as paid`);
  const cancel = inv => update(inv, { status: "Cancelled" }, isBill(inv) ? "Bill cancelled" : `${inv.id} cancelled`);
  const addPayment = async (inv, data) => {
    try { applyResult(inv, await apiRequest(`${base(inv)}/${encodeURIComponent(inv.id)}/payments`, { method: "POST", body: JSON.stringify(data) }), `Payment of Rs ${Math.round(data.amount).toLocaleString("en-US")} saved`); }
    catch (e) { notify(`Could not save the payment: ${e.message}`, true); throw e; }
  };
  const removePayment = async (inv, pid) => {
    try { applyResult(inv, await apiRequest(`${base(inv)}/${encodeURIComponent(inv.id)}/payments/${encodeURIComponent(pid)}`, { method: "DELETE" }), "Payment removed"); }
    catch (e) { notify(`Could not remove the payment: ${e.message}`, true); }
  };
  const sendNotice = n => { openChatWithText(n.to, n.text); setNotice(null); };
  const remove = async inv => {
    try { await apiRequest(`${base(inv)}/${encodeURIComponent(inv.id)}`, { method: "DELETE" }); if (isBill(inv)) setPayables(l => l.filter(x => x.id !== inv.id)); else setRaw(list => list.filter(r => r.id !== inv.id)); setOpenId(null); notify(isBill(inv) ? "Bill deleted" : `${inv.id} deleted`); }
    catch (e) { notify(`Could not delete: ${e.message}`, true); }
  };
  const save = async data => {
    const saved = await apiRequest("/sales", { method: "POST", body: JSON.stringify(data) });
    if (!saved?.id) throw new Error("The server saved the sale but did not return its invoice number. Refresh the page.");
    setRaw(list => [saved, ...list]); setForm(false); setOpenId(saved.id); notify(`Sale saved as ${saved.id}`);
  };
  // A bill = money you have to pay to a person (can be paid in parts).
  const saveBill = async data => {
    const b = await apiRequest("/payables", { method: "POST", body: JSON.stringify(data) });
    setPayables(l => [b, ...l]); touchCategory(b.category); setOpenId(b.id); notify(`Bill for ${b.payee} saved`);
  };

  const touchCategory = name => name && setCategories(l => l.some(c => c.toLowerCase() === name.toLowerCase()) ? l : [...l, name]);
  const addExpense = async data => { const e = await apiRequest("/expenses", { method: "POST", body: JSON.stringify(data) }); setExpenses(l => [e, ...l]); touchCategory(e.category); };
  const removeExpense = async id => {
    if (String(id).startsWith("bill:")) { const [, billId, payId] = id.split(":"); const bill = billRows.find(b => b.id === billId); if (bill) await removePayment(bill, payId); return; }   // a payment made on a bill
    await apiRequest(`/expenses/${id}`, { method: "DELETE" }); setExpenses(l => l.filter(x => x.id !== id));
  };
  const setLimit = async (category, limit) => { await apiRequest(`/budgets/${encodeURIComponent(category)}`, { method: "PUT", body: JSON.stringify({ limit }) }); setBudgets(b => ({ ...b, [category]: limit })); };
  const addCategory = async name => { const r = await apiRequest("/categories", { method: "POST", body: JSON.stringify({ name }) }); setCategories(l => l.some(c => c.toLowerCase() === r.name.toLowerCase()) ? l : [...l, r.name]); notify(`Profile “${r.name}” created`); };
  // Deleting a profile moves its expenses and bills to "Other" (the server does the same), so the screen is updated to match.
  const deleteCategory = async name => {
    await apiRequest(`/categories/${encodeURIComponent(name)}`, { method: "DELETE" });
    const mine = c => String(c || "").toLowerCase() === name.toLowerCase();
    setCategories(l => l.filter(c => !mine(c)));
    setExpenses(l => l.map(e => mine(e.category) ? { ...e, category: "Other" } : e));
    setPayables(l => l.map(b => mine(b.category) ? { ...b, category: "Other" } : b));
    setBudgets(b => Object.fromEntries(Object.entries(b).filter(([k]) => !mine(k))));
    notify(`Profile “${name}” deleted`);
  };
  const saveBusiness = async changes => {
    try { setBusiness(await apiRequest("/settings", { method: "PUT", body: JSON.stringify(changes) })); notify("Saved"); }
    catch (e) { notify(e.message, true); }
  };

  const go = p => { setNavTick(t => t + 1); setPage(p); setSalesQuery(""); setOpenId(null); setDrawer(false); window.scrollTo(0, 0); };
  const company = business.businessName || "Finora Services";
  const [title, sub] = HEAD[page];
  const online = loaded && !error;

  return <div className="shell">
    <aside className={`side ${drawer ? "open" : ""}`}>
      <div className="side-top">
        <div className="logo"><Logo size={42} /><b>finora</b></div>
        <button className="icon-btn side-close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <div className="company"><small>Business</small><b>{company}</b></div>
      <nav aria-label="Main">{NAV.map(([name, Icon]) => <button key={name} className={page === name ? "on" : ""} onClick={() => go(name)} aria-current={page === name ? "page" : undefined}><Icon size={18} />{name}</button>)}</nav>
      <div className="side-foot"><span className={`dot ${online ? "ok" : loading ? "demo" : "bad"}`} />{online ? <span>Saved in database<small>{server?.label}</small></span> : loading ? "Connecting…" : "Database not reachable"}</div>
    </aside>
    {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

    <main>
      <header className="top">
        <button className="icon-btn burger" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="top-brand"><Logo size={36} /><h2 className="top-title"><span className="t-full">{title}</span><span className="t-short">{TAB_LABEL[page]}</span></h2></div>
        <Clock />
        <div className="top-actions">
          <button className="icon-btn theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"} title={theme === "dark" ? "Day mode" : "Night mode"}><Sun className="sun" size={18} /><Moon className="moon" size={17} /></button>
          <Notifications invoices={all} budgets={budgetLevels} onOpenInvoice={r => setOpenId(r.id)} goExpenses={() => go("Expenses")} />
          <button className={`icon-btn ${page === "Settings" ? "on" : ""}`} onClick={() => go("Settings")} aria-label="Settings" title="Settings"><Cog size={18} /></button>
          <button className="icon-btn" onClick={load} aria-label="Refresh data" title="Refresh"><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
          <Button className="new-sale" onClick={() => setForm(true)} disabled={!loaded}><Plus size={16} /><span className="btn-text">New sale</span></Button>
        </div>
      </header>

      <div className="content enter" key={`${page}-${navTick}`}>
        {error && <div className="banner bad" role="alert"><AlertCircle size={16} /><span>{error}</span><Button kind="outline" onClick={load}>Try again</Button></div>}

        <div className="page-head">
          <div><h1>{title}</h1><p>{sub}</p></div>
        </div>

        {!loaded && !error && <div className="panel loading-card"><RefreshCw className="spin" size={20} /><b>Loading your data…</b></div>}
        {loaded && <>
          {page === "Dashboard" && <Dashboard rows={dashRows} allRows={all} expenses={expenseRows} range={dashRange} setRange={setDashRange} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} goSales={() => go("Sales & invoices")} goExpenses={() => go("Expenses")} />}
          {page === "Sales & invoices" && <Sales key={salesQuery} initialQuery={salesQuery} rows={salesRows} range={salesRange} setRange={setSalesRange} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} onAdd={() => setForm(true)} />}
          {page === "Customers" && <Customers rows={all} onOpen={r => setOpenId(r.id)} />}
          {page === "Expenses" && <Expenses sales={all} expenses={expenseRows} bills={billRows} budgets={budgets} people={people} categories={categories} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onAddBill={saveBill} onOpenBill={b => setOpenId(b.id)} onAdd={addExpense} onRemove={removeExpense} onSetLimit={setLimit} notify={notify} />}
          {page === "Settings" && <Settings business={business} onSave={saveBusiness} />}
          {page === "Contact me" && <Contact />}
        </>}
      </div>
      <footer className="foot">
        <span>© {new Date().getFullYear()} Finora · Made by <b>AK</b></span>
        <span className="foot-links"><a href={CONTACT.portfolio} target="_blank" rel="noopener noreferrer">Visit profile <ArrowUpRight size={15} /></a><a href={CONTACT_TEL}><Phone size={15} />Contact</a></span>
      </footer>
    </main>


    <nav className="tabbar" aria-label="Main">
      {NAV.filter(([name]) => name !== "Settings").map(([name, Icon]) => { const n = name === "Sales & invoices" ? all.filter(r => r.status === "Overdue").length : 0;
        return <button key={name} className={page === name ? "on" : ""} onClick={() => go(name)} aria-current={page === name ? "page" : undefined}>
          <span className="ti"><Icon size={21} strokeWidth={page === name ? 2.4 : 1.9} /></span>{TAB_LABEL[name]}{n > 0 && <span className="tab-badge">{n > 9 ? "9+" : n}</span>}
        </button>; })}
    </nav>
    {loaded && ["Dashboard", "Sales & invoices", "Customers"].includes(page) && <button className="fab" onClick={() => setForm(true)} aria-label="New sale"><Plus size={24} /></button>}

    {open && <InvoiceModal invoice={open} company={company} onClose={() => setOpenId(null)} onMarkPaid={markPaid} onCancel={cancel} onDelete={remove} onSavePhone={savePhone} onAddPayment={addPayment} onRemovePayment={removePayment} notice={notice} onSendNotice={sendNotice} onDismissNotice={() => setNotice(null)} notify={notify} />}
    {form && <SaleForm services={services} customers={customers} onClose={() => setForm(false)} onSave={save} />}
    {toast && <div className={`toast ${toast.bad ? "bad" : ""}`} role="status">{toast.bad ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{toast.text}</div>}
  </div>;
}
