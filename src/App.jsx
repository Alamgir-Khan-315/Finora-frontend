import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, ReceiptText, Users, Settings as Cog, Plus, Menu, X, RefreshCw, AlertCircle, CheckCircle2, Sun, Moon, ArrowUpRight, Calculator, Wallet } from "lucide-react";
import { apiRequest, resolveServer } from "./config";
import { normalize, dateInRange, RANGES, fmtDate } from "./lib";
import { Button, Clock } from "./components/ui";
import Dashboard from "./components/Dashboard";
import Sales from "./components/Sales";
import Customers from "./components/Customers";
import InvoiceModal from "./components/InvoiceModal";
import SaleForm from "./components/SaleForm";
import Settings from "./components/Settings";
import Logo from "./components/Logo";
import Calculators from "./components/Calculators";
import Expenses, { budgetStatus } from "./components/Expenses";
import Notifications from "./components/Notifications";

const NAV = [["Dashboard", LayoutDashboard], ["Sales & invoices", ReceiptText], ["Customers", Users], ["Expenses", Wallet], ["Calculators", Calculator], ["Settings", Cog]];
const HEAD = {
  "Dashboard": ["Dashboard", "Your sales, money received, expenses and profit at a glance."],
  "Sales & invoices": ["Sales & invoices", "Every sale with its invoice. Open one to preview or download the PDF."],
  "Customers": ["Customers", "Who you sell to and who still owes you."],
  "Expenses": ["Expenses", "Month-by-month income, spending and profit or loss."],
  "Calculators": ["Calculators", "Loan EMI, investment growth and live currency conversion."],
  "Settings": ["Settings", "Business details shown on your invoices."]
};
const DEFAULT_PORTFOLIO = "https://portfolio-web-psi-rosy.vercel.app/";

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [drawer, setDrawer] = useState(false);
  const [raw, setRaw] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({});
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
      const [sales, exp, bud, biz] = await Promise.all([apiRequest("/sales"), apiRequest("/expenses"), apiRequest("/budgets"), apiRequest("/settings")]);
      if (!Array.isArray(sales) || !Array.isArray(exp)) throw new Error("The server returned unexpected data.");
      setRaw(sales); setExpenses(exp); setBudgets(Object.fromEntries(bud.map(b => [b.category, b.limit]))); setBusiness(biz); setLoaded(true);
    } catch (e) { setError(e.message || "Could not load your data."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const all = useMemo(() => raw.map(normalize).sort((a, b) => b.date - a.date), [raw]);
  const dashRows = useMemo(() => all.filter(r => dateInRange(r.date, dashRange)), [all, dashRange]);
  const salesRows = useMemo(() => all.filter(r => dateInRange(r.date, salesRange)), [all, salesRange]);
  const open = all.find(r => r.id === openId) || null;
  const customers = useMemo(() => {
    const map = new Map();   // newest invoice first, so the most recent email/number wins
    all.forEach(r => { const c = map.get(r.customer) || { name: r.customer, email: "", phone: "" }; c.email ||= r.customerEmail; c.phone ||= r.customerPhone; map.set(r.customer, c); });
    return [...map.values()];
  }, [all]);
  const services = useMemo(() => [...new Set(all.map(r => r.service))].filter(Boolean), [all]);
  const budgetLevels = useMemo(() => budgetStatus(expenses, budgets), [expenses, budgets]);

  const replace = useCallback((id, record) => setRaw(list => list.map(r => r.id === id ? record : r)), []);
  const update = async (inv, changes, message) => {
    try { replace(inv.id, await apiRequest(`/sales/${encodeURIComponent(inv.id)}`, { method: "PATCH", body: JSON.stringify(changes) })); notify(message); }
    catch (e) { notify(`Could not update ${inv.id}: ${e.message}`, true); }
  };
  const savePhone = (inv, phone) => update(inv, { customerPhone: phone }, phone ? "WhatsApp number saved" : "WhatsApp number removed");
  const markPaid = inv => update(inv, { status: "Paid", method: inv.method !== "Not recorded" ? inv.method : "Bank Transfer" }, `${inv.id} marked as paid`);
  const cancel = inv => update(inv, { status: "Cancelled" }, `${inv.id} cancelled`);
  const remove = async inv => {
    try { await apiRequest(`/sales/${encodeURIComponent(inv.id)}`, { method: "DELETE" }); setRaw(list => list.filter(r => r.id !== inv.id)); setOpenId(null); notify(`${inv.id} deleted`); }
    catch (e) { notify(`Could not delete ${inv.id}: ${e.message}`, true); }
  };
  const save = async data => {
    const saved = await apiRequest("/sales", { method: "POST", body: JSON.stringify(data) });
    if (!saved?.id) throw new Error("The server saved the sale but did not return its invoice number. Refresh the page.");
    setRaw(list => [saved, ...list]); setForm(false); setOpenId(saved.id); notify(`Sale saved as ${saved.id}`);
  };

  const addExpense = async data => { const e = await apiRequest("/expenses", { method: "POST", body: JSON.stringify(data) }); setExpenses(l => [e, ...l]); };
  const removeExpense = async id => { await apiRequest(`/expenses/${id}`, { method: "DELETE" }); setExpenses(l => l.filter(x => x.id !== id)); };
  const setLimit = async (category, limit) => { await apiRequest(`/budgets/${encodeURIComponent(category)}`, { method: "PUT", body: JSON.stringify({ limit }) }); setBudgets(b => ({ ...b, [category]: limit })); };
  const saveBusiness = async changes => {
    try { setBusiness(await apiRequest("/settings", { method: "PUT", body: JSON.stringify(changes) })); notify("Saved"); }
    catch (e) { notify(e.message, true); }
  };

  const go = p => { setPage(p); setSalesQuery(""); setDrawer(false); window.scrollTo(0, 0); };
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
        <Clock />
        <div className="top-actions">
          <button className="icon-btn theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"} title={theme === "dark" ? "Day mode" : "Night mode"}><Sun className="sun" size={18} /><Moon className="moon" size={17} /></button>
          <Notifications invoices={all} budgets={budgetLevels} onOpenInvoice={r => setOpenId(r.id)} goExpenses={() => go("Expenses")} />
          <button className="icon-btn" onClick={load} aria-label="Refresh data" title="Refresh"><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
          <Button onClick={() => setForm(true)} disabled={!loaded}><Plus size={16} /><span className="btn-text">New sale</span></Button>
        </div>
      </header>

      <div className="content enter" key={page}>
        {error && <div className="banner bad" role="alert"><AlertCircle size={16} /><span>{error}</span><Button kind="outline" onClick={load}>Try again</Button></div>}

        <div className="page-head">
          <div><h1>{title}</h1><p>{sub}</p></div>
        </div>

        {!loaded && !error && <div className="panel loading-card"><RefreshCw className="spin" size={20} /><b>Loading your data…</b></div>}
        {loaded && <>
          {page === "Dashboard" && <Dashboard rows={dashRows} allRows={all} expenses={expenses} range={dashRange} setRange={setDashRange} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} goSales={() => go("Sales & invoices")} goExpenses={() => go("Expenses")} />}
          {page === "Sales & invoices" && <Sales key={salesQuery} initialQuery={salesQuery} rows={salesRows} range={salesRange} setRange={setSalesRange} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} onAdd={() => setForm(true)} />}
          {page === "Customers" && <Customers rows={all} onFilter={name => { setSalesRange("all"); go("Sales & invoices"); setSalesQuery(name); }} />}
          {page === "Expenses" && <Expenses sales={all} expenses={expenses} budgets={budgets} onAdd={addExpense} onRemove={removeExpense} onSetLimit={setLimit} notify={notify} />}
          {page === "Calculators" && <Calculators />}
          {page === "Settings" && <Settings business={business} onSave={saveBusiness} />}
        </>}
      </div>
      <footer className="foot">
        <span>© {new Date().getFullYear()} Finora · Made by <b>AK</b></span>
        <a href={business.portfolio || DEFAULT_PORTFOLIO} target="_blank" rel="noopener noreferrer">Visit portfolio <ArrowUpRight size={15} /></a>
      </footer>
    </main>

    {open && <InvoiceModal invoice={open} company={company} onClose={() => setOpenId(null)} onMarkPaid={markPaid} onCancel={cancel} onDelete={remove} onSavePhone={savePhone} notify={notify} />}
    {form && <SaleForm services={services} customers={customers} onClose={() => setForm(false)} onSave={save} />}
    {toast && <div className={`toast ${toast.bad ? "bad" : ""}`} role="status">{toast.bad ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{toast.text}</div>}
  </div>;
}
