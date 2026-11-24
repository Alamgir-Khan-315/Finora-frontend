import React, { useCallback, useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
import { LayoutDashboard, ReceiptText, Users, Settings as Cog, Plus, RefreshCw, AlertCircle, CheckCircle2, Sun, Moon, ArrowUpRight, Wallet, Info, UserRound, Phone } from "lucide-react";
import { apiRequest, resolveServer, DEVELOPER } from "./config";
import { normalize, normalizeBill, billExpenseRows, dateInRange } from "./lib";
=======
import { LayoutDashboard, ReceiptText, Users, Settings as Cog, Plus, RefreshCw, AlertCircle, CheckCircle2, Sun, Moon, ArrowUpRight, Calculator, Wallet, Info, UserRound, Phone } from "lucide-react";
import { apiRequest, resolveServer, DEVELOPER } from "./config";
import { normalize, normalizeWork, normalizeBill, billExpenseRows, dateInRange, num } from "./lib";
>>>>>>> 901e7f00b926b682a5b4b0feea7605c92c6f09b7
import { openChatWithText } from "./whatsapp";
import { Button, Clock } from "./components/ui";
import Dashboard from "./components/Dashboard";
import Sales from "./components/Sales";
import Customers from "./components/Customers";
import InvoiceModal from "./components/InvoiceModal";
import SaleForm from "./components/SaleForm";
import Settings from "./components/Settings";
import Logo from "./components/Logo";
import Expenses, { budgetStatus } from "./components/Expenses";
import Notifications from "./components/Notifications";
import About from "./components/About";
import Contact from "./components/Contact";
import InfoSheet from "./components/InfoSheet";

const NAV = [["Dashboard", LayoutDashboard], ["Sales & invoices", ReceiptText], ["Customers", Users], ["Expenses", Wallet], ["About Finora", Info], ["Contact (developer)", UserRound], ["Settings", Cog]];
// Phone bottom bar: [page, short label, icon]. About + Developer live behind the (i) button in the header.
const TABS = [["Dashboard", "Home", LayoutDashboard], ["Sales & invoices", "Sales", ReceiptText], ["Customers", "Customers", Users], ["Expenses", "Expenses", Wallet], ["Settings", "Settings", Cog]];
const HEAD = {
  "Dashboard": ["Dashboard", "Your sales, money received, expenses and profit at a glance."],
  "Sales & invoices": ["Sales & invoices", "Every sale with its invoice. Open one to preview or download the PDF."],
  "Customers": ["Customers", "Who you sell to and who still owes you."],
  "Expenses": ["Expenses", "Month-by-month income, spending and profit or loss."],
  "About Finora": ["About Finora", "What Finora does and how it keeps your data."],
  "Contact (developer)": ["Contact (developer)", "Who made Finora, and how to get a website or software made for your business."],
  "Settings": ["Settings", "Business details shown on your invoices."]
};
const PORTFOLIO = DEVELOPER.portfolio;   // fixed: the developer link cannot be changed from the app

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [info, setInfo] = useState(false);
  const [raw, setRaw] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [profiles, setProfiles] = useState([]);   // your own expense profiles (the built-in ones live in code)
  const [payables, setPayables] = useState([]);   // bills you owe to employees / sellers
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

  // Phones: every data table turns into a stack of cards. This copies each column title onto its cells so a card can show "Amount: Rs 500".
  useEffect(() => {
    const label = () => document.querySelectorAll("table:not(.report):not(.paper-lines)").forEach(t => {
      const heads = [...t.querySelectorAll("thead th")].map(h => h.querySelector(".sr") ? "" : h.textContent.trim());
      t.classList.add("m-cards");
      t.querySelectorAll("tbody tr").forEach(tr => [...tr.children].forEach((td, i) => { const l = heads[i] && heads[i] !== "Actions" ? heads[i] : ""; if (l) { if (td.dataset.label !== l) td.dataset.label = l; } else td.classList.add("m-nolabel"); }));
    });
    label(); const mo = new MutationObserver(label); mo.observe(document.body, { childList: true, subtree: true }); return () => mo.disconnect();
  }, []);

  const notify = useCallback((text, bad = false) => { setToast({ text, bad }); clearTimeout(notify.t); notify.t = setTimeout(() => setToast(null), 3200); }, []);

  // Everything lives in the database: sales, expenses, budgets and business details.
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setServer(await resolveServer(true));
      const [sales, exp, bud, biz, bills, profs] = await Promise.all([apiRequest("/sales"), apiRequest("/expenses"), apiRequest("/budgets"), apiRequest("/settings"), apiRequest("/payables"), apiRequest("/profiles").catch(() => [])]);
      if (!Array.isArray(sales) || !Array.isArray(exp) || !Array.isArray(bills)) throw new Error("The server returned unexpected data.");
      setProfiles(Array.isArray(profs) ? profs : []); setRaw(sales); setPayables(bills); setExpenses(exp); setBudgets(Object.fromEntries(bud.map(b => [b.category, b.limit]))); setBusiness(biz); setLoaded(true);
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
  const budgetLevels = useMemo(() => budgetStatus(expenseRows, budgets), [expenseRows, budgets]);

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
    setPayables(l => [b, ...l]); setOpenId(b.id); notify(`Bill for ${b.payee} saved`);
  };
  const addExpense = async data => { const e = await apiRequest("/expenses", { method: "POST", body: JSON.stringify(data) }); setExpenses(l => [e, ...l]); };
  const removeExpense = async id => {
    if (String(id).startsWith("bill:")) { const [, billId, payId] = id.split(":"); const bill = billRows.find(b => b.id === billId); if (bill) await removePayment(bill, payId); return; }   // a payment made on a bill
    await apiRequest(`/expenses/${id}`, { method: "DELETE" }); setExpenses(l => l.filter(x => x.id !== id));
  };
  const setLimit = async (category, limit) => { await apiRequest(`/budgets/${encodeURIComponent(category)}`, { method: "PUT", body: JSON.stringify({ limit }) }); setBudgets(b => ({ ...b, [category]: limit })); };
  const saveBusiness = async changes => {
    try { setBusiness(await apiRequest("/settings", { method: "PUT", body: JSON.stringify(changes) })); notify("Saved"); }
    catch (e) { notify(e.message, true); }
  };

  // Expense profiles
  const byName = (a, b) => a.name.localeCompare(b.name);
  const createProfile = async name => { const p = await apiRequest("/profiles", { method: "POST", body: JSON.stringify({ name }) }); setProfiles(l => [...l, p].sort(byName)); notify(`Profile “${p.name}” created`); };
  const renameProfile = async (p, name) => {
    const u = await apiRequest(`/profiles/${encodeURIComponent(p.id)}`, { method: "PATCH", body: JSON.stringify({ name }) });
    setProfiles(l => l.map(x => x.id === p.id ? u : x).sort(byName));
    const move = to => r => r.category === p.name ? { ...r, category: to } : r;
    setExpenses(l => l.map(move(u.name))); setPayables(l => l.map(move(u.name))); notify("Profile renamed");
  };
  const deleteProfile = async p => {
    if (p.builtin) { await apiRequest(`/profiles/builtin/${encodeURIComponent(p.name)}`, { method: "DELETE" }); setBusiness(b => ({ ...b, hiddenProfiles: [...new Set([...(b.hiddenProfiles || []), p.name])] })); }
    else { await apiRequest(`/profiles/${encodeURIComponent(p.id)}`, { method: "DELETE" }); setProfiles(l => l.filter(x => x.id !== p.id)); }
    const move = r => r.category === p.name ? { ...r, category: "Other" } : r;
    setExpenses(l => l.map(move)); setPayables(l => l.map(move)); notify(`Profile “${p.name}” deleted. Its expenses moved to Other.`);
  };

  const go = p => { setPage(p); setSalesQuery(""); setOpenId(null); window.scrollTo(0, 0); };
  const company = business.businessName || "Finora Services";
  const [title, sub] = HEAD[page];
  const online = loaded && !error;

  return <div className="shell">
    <aside className="side">
      <div className="side-top">
        <div className="logo"><Logo size={42} /><b>finora</b></div>
      </div>
      <div className="company"><small>Business</small><b>{company}</b></div>
      <nav aria-label="Main">{NAV.map(([name, Icon]) => <button key={name} className={page === name ? "on" : ""} onClick={() => go(name)} aria-current={page === name ? "page" : undefined}><Icon size={18} />{name}</button>)}</nav>
      <div className="side-foot"><span className={`dot ${online ? "ok" : loading ? "demo" : "bad"}`} />{online ? <span>Saved in database<small>{server?.label}</small></span> : loading ? "Connecting…" : "Database not reachable"}</div>
    </aside>

    <main>
      <header className="top">
        <div className="top-brand" key={page}><Logo size={36} /><div><small>finora</small><b>{title}</b></div></div>
        <Clock />
        <div className="top-actions">
          <button className="icon-btn theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"} title={theme === "dark" ? "Day mode" : "Night mode"}><Sun className="sun" size={18} /><Moon className="moon" size={17} /></button>
          <Notifications invoices={all} budgets={budgetLevels} onOpenInvoice={r => setOpenId(r.id)} goExpenses={() => go("Expenses")} />
          <button className="icon-btn refresh-btn" onClick={load} aria-label="Refresh data" title="Refresh"><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
          <Button className="new-sale-top" onClick={() => setForm(true)} disabled={!loaded}><Plus size={16} /><span className="btn-text">New sale</span></Button>
          <button className="icon-btn info-btn" onClick={() => setInfo(true)} aria-label="About Finora and developer" title="About & developer"><Info size={18} /></button>
        </div>
      </header>

      <div className="content enter" key={page}>
        {error && <div className="banner bad" role="alert"><AlertCircle size={16} /><span>{error}</span><Button kind="outline" onClick={load}>Try again</Button></div>}

        <div className="page-head">
          <div><h1>{title}</h1><p>{sub}</p></div>
        </div>

        {!loaded && !error && <div className="panel loading-card"><RefreshCw className="spin" size={20} /><b>Loading your data…</b></div>}
        {loaded && <>
          {page === "Dashboard" && <Dashboard rows={dashRows} allRows={all} expenses={expenseRows} range={dashRange} setRange={setDashRange} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} goSales={() => go("Sales & invoices")} goExpenses={() => go("Expenses")} />}
          {page === "Sales & invoices" && <Sales key={salesQuery} initialQuery={salesQuery} rows={salesRows} range={salesRange} setRange={setSalesRange} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} onAdd={() => setForm(true)} company={company} notify={notify} />}
          {page === "Customers" && <Customers rows={all} company={company} notify={notify} onFilter={name => { setSalesRange("all"); go("Sales & invoices"); setSalesQuery(name); }} />}
          {page === "Expenses" && <Expenses sales={all} expenses={expenseRows} bills={billRows} budgets={budgets} onAddBill={saveBill} onOpenBill={b => setOpenId(b.id)} onAdd={addExpense} onRemove={removeExpense} onSetLimit={setLimit} notify={notify} company={company} profiles={profiles} hiddenProfiles={business.hiddenProfiles || []} onCreateProfile={createProfile} onRenameProfile={renameProfile} onDeleteProfile={deleteProfile} />}
          {page === "About Finora" && <About company={company} />}
          {page === "Contact (developer)" && <Contact portfolio={PORTFOLIO} />}
          {page === "Settings" && <Settings business={business} onSave={saveBusiness} />}
        </>}
      </div>
      <footer className="foot">
        <span>© {new Date().getFullYear()} Finora · Made by <b>AK</b></span>
        <span className="foot-links"><a href={PORTFOLIO} target="_blank" rel="noopener noreferrer">Visit profile <ArrowUpRight size={15} /></a><button type="button" onClick={() => go("Contact (developer)")}><Phone size={14} />Contact</button></span>
      </footer>
    </main>

    <button className="fab" onClick={() => setForm(true)} disabled={!loaded} aria-label="New sale"><Plus size={26} strokeWidth={2.4} /></button>
    <nav className="tabbar" aria-label="Main" style={{ "--i": Math.max(0, TABS.findIndex(t => t[0] === page)), "--n": TABS.length }}>
      <i className={`tab-pill ${TABS.some(t => t[0] === page) ? "" : "hide"}`} aria-hidden="true" />
      {TABS.map(([name, label, Icon]) => <button key={name} className={page === name ? "on" : ""} onClick={() => go(name)} aria-label={name} aria-current={page === name ? "page" : undefined}><Icon size={21} strokeWidth={page === name ? 2.3 : 1.9} /><span>{label}</span></button>)}
    </nav>
    {info && <InfoSheet company={company} portfolio={PORTFOLIO} onClose={() => setInfo(false)} />}

    {open && <InvoiceModal invoice={open} company={company} onClose={() => setOpenId(null)} onMarkPaid={markPaid} onCancel={cancel} onDelete={remove} onSavePhone={savePhone} onAddPayment={addPayment} onRemovePayment={removePayment} notice={notice} onSendNotice={sendNotice} onDismissNotice={() => setNotice(null)} notify={notify} />}
    {form && <SaleForm services={services} customers={customers} onClose={() => setForm(false)} onSave={save} />}
    {toast && <div className={`toast ${toast.bad ? "bad" : ""}`} role="status">{toast.bad ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{toast.text}</div>}
  </div>;
}
