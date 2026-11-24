import React, { useEffect, useState } from "react";
import { Save, Database } from "lucide-react";
import { Button } from "./ui";

export default function Settings({ business, onSave }) {
  const [name, setName] = useState(business.businessName);
  const [site, setSite] = useState(business.portfolio || "");
  useEffect(() => { setName(business.businessName); setSite(business.portfolio || ""); }, [business]);
  const dirty = name.trim() !== business.businessName || site.trim() !== (business.portfolio || "");
  return <div className="grid-2 settings">
    <section className="panel">
      <div className="panel-head"><div><h3>Business details</h3><p>The business name appears on every invoice and in the sidebar.</p></div></div>
      <form className="form single" onSubmit={e => { e.preventDefault(); onSave({ businessName: name, portfolio: site }); }}>
        <label>Business name<input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label><span>Portfolio link <em>opened by “Visit portfolio” in the footer</em></span><input type="url" value={site} onChange={e => setSite(e.target.value)} placeholder="https://your-portfolio.com" /></label>
        <div><Button type="submit" disabled={!dirty}><Save size={15} />Save changes</Button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>Your data</h3><p>Sales, expenses, budgets and these settings are all stored in your database, so they are the same on every device.</p></div></div>
      <div className="data-note"><Database size={20} /><div><b>Everything is saved automatically</b><span>No offline copy is kept in the browser. If the connection drops, you will see a warning and nothing is lost that was already saved.</span></div></div>
    </section>
  </div>;
}
