import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, ReceiptText, Users, Settings as Cog, Plus, Menu, X, RefreshCw, AlertCircle, CheckCircle2, Sun, Moon, ArrowUpRight } from "lucide-react";
import { apiRequest, setApiConfig } from "./config";
import { normalize, demoSales, inRange, RANGES, fmtDate, toInputDate } from "./lib";
import { Button } from "./components/ui";
import Dashboard from "./components/Dashboard";
import Sales from "./components/Sales";
import Customers from "./components/Customers";
import InvoiceModal from "./components/InvoiceModal";
import SaleForm from "./components/SaleForm";
import Settings from "./components/Settings";
import Logo from "./components/Logo";

const NAV = [["Dashboard", LayoutDashboard], ["Sales & invoices", ReceiptText], ["Customers", Users], ["Settings", Cog]];
const HEAD = {
  "Dashboard": ["Sales overview", "What you have billed, collected and still need to chase."],
  "Sales & invoices": ["Sales & invoices", "Every sale with its invoice. Open one to preview or download the PDF."],
  "Customers": ["Customers", "Who you sell to and who still owes you."],
  "Settings": ["Settings", "Business name and database connection."]
};
const lsGet = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [drawer, setDrawer] = useState(false);
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Connecting");
  const [reload, setReload] = useState(0);
  const [range, setRange] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [salesQuery, setSalesQuery] = useState("");
  const [company, setCompanyState] = useState(lsGet("finora_company", "Finora Services"));
  const [apiUrl, setApiUrl] = useState(lsGet("finora_api_url", "http://localhost:5000/api"));
  const [mode, setMode] = useState(lsGet("finora_data_mode", "api"));
  const [portfolio, setPortfolio] = useState(lsGet("finora_portfolio", "#"));
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("finora_theme", theme); } catch {}
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0d1219" : "#141a24");
  }, [theme]);

  const notify = useCallback((text, bad = false) => { setToast({ text, bad }); clearTimeout(notify.t); notify.t = setTimeout(() => setToast(null), 3200); }, []);

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    if (mode === "demo") { setRaw(demoSales()); setStatus("Demo mode"); setLoading(false); return; }
    apiRequest("/sales")
      .then(list => { if (live) { setRaw(list); setStatus("Connected"); } })
      .catch(e => { if (live) { setRaw([]); setStatus("Not connected"); setError(e.message || "Could not load sales."); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [mode, apiUrl, reload]);

  const all = useMemo(() => raw.map(normalize).sort((a, b) => b.date - a.date), [raw]);
  const rows = useMemo(() => all.filter(r => inRange(r, range)), [all, range]);
  const rangeLabel = RANGES.find(r => r[0] === range)[1];
  const open = all.find(r => r.id === openId) || null;
  const customers = useMemo(() => [...new Map(all.map(r => [r.customer, { name: r.customer, email: r.customerEmail }])).values()], [all]);
  const services = useMemo(() => [...new Set(all.map(r => r.service))].filter(Boolean), [all]);

  const patch = useCallback((id, changes) => setRaw(list => list.map(r => r.id === id ? { ...r, ...changes } : r)), []);

  const update = async (inv, changes, message) => {
    try {
      if (mode === "api") await apiRequest(`/sales/${encodeURIComponent(inv.id)}`, { method: "PATCH", body: JSON.stringify(changes) });
      patch(inv.id, changes); notify(message);
    } catch (e) { notify(`Could not update ${inv.id}: ${e.message}`, true); }
  };
  const markPaid = inv => update(inv, { status: "Paid", method: inv.method !== "Not recorded" ? inv.method : "Bank Transfer" }, `${inv.id} marked as paid`);
  const cancel = inv => update(inv, { status: "Cancelled" }, `${inv.id} cancelled`);
  const remove = async inv => {
    try {
      if (mode === "api") await apiRequest(`/sales/${encodeURIComponent(inv.id)}`, { method: "DELETE" });
      setRaw(list => list.filter(r => r.id !== inv.id)); setOpenId(null); notify(`${inv.id} deleted`);
    } catch (e) { notify(`Could not delete ${inv.id}: ${e.message}`, true); }
  };
  const save = async data => {
    let record;
    if (mode === "api") record = await apiRequest("/sales", { method: "POST", body: JSON.stringify(data) });
    else {
      const next = Math.max(1000, ...raw.map(r => Number(String(r.id).replace(/\D/g, "")) || 0)) + 1;
      record = { ...data, id: `INV-${next}` };
    }
    setRaw(list => [record, ...list]); setForm(false); setOpenId(record.id);
    notify(`Sale saved as ${record.id}`);
  };

  const go = p => { setPage(p); setSalesQuery(""); setDrawer(false); window.scrollTo(0, 0); };
  const testApi = async url => {
    try {
      const r = await fetch(url.replace(/\/$/, "") + "/health"); const info = await r.json();
      notify(info.database === "connected" ? "Connected to MongoDB" : "Server is running but MongoDB is not connected", info.database !== "connected");
    } catch { notify("Could not reach the server. Check the address and that the server is running.", true); }
  };
  const saveApi = (url, m) => { setApiConfig({ baseUrl: url, mode: m }); setApiUrl(url.trim()); setMode(m); setReload(x => x + 1); notify("Connection saved"); };
  const setCompany = name => { try { localStorage.setItem("finora_company", name); } catch {} setCompanyState(name); notify("Business name saved"); };

  const showRange = page === "Dashboard" || page === "Sales & invoices";
  const [title, sub] = HEAD[page];
  const dot = status === "Connected" ? "ok" : status === "Demo mode" ? "demo" : "bad";

  return <div className="shell">
    <aside className={`side ${drawer ? "open" : ""}`}>
      <div className="side-top">
        <div className="logo"><Logo size={34} /><b>finora</b></div>
        <button className="icon-btn side-close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <div className="company"><small>Workspace</small><b>{company}</b></div>
      <nav>{NAV.map(([name, Icon]) => <button key={name} className={page === name ? "on" : ""} onClick={() => go(name)} aria-current={page === name ? "page" : undefined}><Icon size={18} />{name}</button>)}</nav>
      <div className="side-foot"><span className={`dot ${dot}`} />{status === "Connected" ? "Live from MongoDB" : status === "Demo mode" ? "Demo data" : status}</div>
    </aside>
    {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

    <main>
      <header className="top">
        <button className="icon-btn burger" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="today">{fmtDate(new Date())}</div>
        <div className="top-actions">
          <button className="icon-btn theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"} title={theme === "dark" ? "Day mode" : "Night mode"}><Sun className="sun" size={18} /><Moon className="moon" size={17} /></button>
          <button className="icon-btn" onClick={() => setReload(x => x + 1)} aria-label="Refresh data" title="Refresh"><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
          <Button onClick={() => setForm(true)}><Plus size={16} />New sale</Button>
        </div>
      </header>

      <div className="content enter" key={page}>
        {mode === "demo" && <div className="banner demo"><AlertCircle size={16} />You are looking at demo data. Switch to live data in Settings to see your own sales.</div>}
        {error && <div className="banner bad"><AlertCircle size={16} /><span>{error} Make sure the server is running and MongoDB Atlas allows your IP address.</span><Button kind="outline" onClick={() => setReload(x => x + 1)}>Try again</Button></div>}

        <div className="page-head">
          <div><h1>{title}</h1><p>{sub}</p></div>
          {showRange && <label className="range"><span>Period</span><select value={range} onChange={e => setRange(e.target.value)}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>}
        </div>

        {page === "Dashboard" && <Dashboard rows={rows} allRows={all} rangeLabel={rangeLabel} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} goSales={() => go("Sales & invoices")} />}
        {page === "Sales & invoices" && <Sales key={salesQuery} initialQuery={salesQuery} rows={rows} rangeLabel={rangeLabel} onOpen={r => setOpenId(r.id)} onMarkPaid={markPaid} onAdd={() => setForm(true)} />}
        {page === "Customers" && <Customers rows={all} onFilter={name => { setRange("all"); go("Sales & invoices"); setSalesQuery(name); }} />}
        {page === "Settings" && <Settings company={company} setCompany={setCompany} apiUrl={apiUrl} mode={mode} status={status} onTest={testApi} onSave={saveApi} portfolio={portfolio} setPortfolio={url => { try { localStorage.setItem("finora_portfolio", url); } catch {} setPortfolio(url); notify("Portfolio link saved"); }} />}
      </div>
      <footer className="foot">
        <span>© 2026 Finora · Made by <b>AK</b></span>
        <a href="https://portfolio-web-psi-rosy.vercel.app/" target="_blank" rel="noopener noreferrer">Visit portfolio <ArrowUpRight size={15} /></a>
      </footer>
    </main>

    {open && <InvoiceModal invoice={open} company={company} onClose={() => setOpenId(null)} onMarkPaid={markPaid} onCancel={cancel} onDelete={remove} notify={notify} />}
    {form && <SaleForm services={services} customers={customers} onClose={() => setForm(false)} onSave={save} />}
    {toast && <div className={`toast ${toast.bad ? "bad" : ""}`} role="status">{toast.bad ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{toast.text}</div>}
  </div>;
}
