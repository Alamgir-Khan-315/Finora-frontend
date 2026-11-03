import React, { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { Button, Status } from "./ui";
import { DEFAULT_API_URL } from "../config";

export default function Settings({ company, setCompany, apiUrl: savedUrl, mode: savedMode, status, onTest, onSave, portfolio, setPortfolio }) {
  const [name, setName] = useState(company);
  const [apiUrl, setApiUrl] = useState(savedUrl);
  const [mode, setMode] = useState(savedMode);
  const [site, setSite] = useState(portfolio === "#" ? "" : portfolio);
  return <div className="grid-2 settings">
    <section className="panel">
      <div className="panel-head"><div><h3>Business</h3><p>Shown on every invoice and in the sidebar.</p></div></div>
      <div className="form single">
        <label><span>Business name</span><input value={name} onChange={e => setName(e.target.value)} /></label>
        <div><Button onClick={() => setCompany(name.trim() || "Finora Services")}><Save size={15} />Save name</Button></div>
        <label><span>Portfolio link <em>opened by "Visit portfolio" in the footer</em></span><input value={site} onChange={e => setSite(e.target.value)} placeholder="https://your-portfolio.com" /></label>
        <div><Button kind="outline" onClick={() => setPortfolio(site.trim() || "#")}><Save size={15} />Save link</Button></div>
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>Database connection</h3><p>Choose live server data, this device’s saved data, or sample data.</p></div><Status value={status === "Connected" ? "Paid" : status === "Demo mode" || status === "Offline mode" ? "Pending" : "Overdue"} /></div>
      <div className="form single">
        <label>Server address<input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder={DEFAULT_API_URL} /></label>
        <div className="seg-choice" role="radiogroup" aria-label="Data source">
          <button className={mode === "api" ? "on" : ""} role="radio" aria-checked={mode === "api"} onClick={() => setMode("api")}><b>Live data</b><span>Your MongoDB sales</span></button>
          <button className={mode === "offline" ? "on" : ""} role="radio" aria-checked={mode === "offline"} onClick={() => setMode("offline")}><b>Offline data</b><span>Saved on this device</span></button>
          <button className={mode === "demo" ? "on" : ""} role="radio" aria-checked={mode === "demo"} onClick={() => setMode("demo")}><b>Demo data</b><span>Sample invoices</span></button>
        </div>
        <div className="btn-row"><Button kind="outline" onClick={() => onTest(apiUrl)}><RefreshCw size={15} />Test connection</Button><Button onClick={() => onSave(apiUrl, mode)}><Save size={15} />Save connection</Button></div>
        <p className="hint">Offline sales stay in this browser and do not sync to the server. Database passwords stay on the server and are never entered here.</p>
      </div>
    </section>
  </div>;
}
