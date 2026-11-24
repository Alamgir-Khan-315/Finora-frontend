import React, { useMemo, useState } from "react";
import { ChevronRight, ArrowLeft, FolderPlus, SlidersHorizontal, Download, Plus, Trash2, Pencil, Check, X, Lock } from "lucide-react";
import { money, fmtDate, toInputDate, expenseDate } from "../lib";
import { CATEGORIES, PAYEE_TYPES, profileColor, initialOf } from "../profiles";
import { exportExpenses } from "../exports";
import { Button, Empty, Modal } from "./ui";

const sameMonth = d => { const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };

function Avatar({ name, size = 46 }) {
  return <span className="pf-avatar" style={{ background: profileColor(name), width: size, height: size, fontSize: size * 0.38 }}>{initialOf(name)}</span>;
}

// The Profiles tab: one card per profile. Open a card to see every expense of that profile and download it as Excel.
export default function Profiles({ expenses, profiles, onAdd, onRemove, onCreate, onRename, onDelete, notify, company }) {
  const [open, setOpen] = useState(null), [creating, setCreating] = useState(false), [managing, setManaging] = useState(false);
  const rows = useMemo(() => expenses.map(e => ({ ...e, d: expenseDate(e) })).sort((a, b) => b.d - a.d), [expenses]);
  const custom = useMemo(() => profiles.map(p => p.name), [profiles]);
  const cards = useMemo(() => {
    const names = [...new Set([...CATEGORIES, ...custom, ...rows.map(r => r.category).filter(Boolean)])];
    return names.map(name => {
      const mine = rows.filter(r => r.category === name);
      return { name, count: mine.length, total: mine.reduce((a, r) => a + Number(r.amount), 0), month: mine.filter(r => sameMonth(r.d)).reduce((a, r) => a + Number(r.amount), 0), custom: custom.includes(name) };
    }).sort((a, b) => (b.count > 0) - (a.count > 0) || b.total - a.total || a.name.localeCompare(b.name));
  }, [rows, custom]);

  const current = open && cards.find(c => c.name === open);
  if (current) return <ProfileDetail {...{ profile: current, rows: rows.filter(r => r.category === current.name), onBack: () => setOpen(null), onAdd, onRemove, notify, company }} />;

  return <>
    <section className="panel">
      <div className="panel-head"><div><h3>Expense profiles</h3><p>Every category is a profile, like a customer. Open one (Home, Rent, Site A…) to see all its expenses and download them as Excel.</p></div>
        <div className="toolbar-right"><Button kind="outline" onClick={() => setManaging(true)}><SlidersHorizontal size={15} />Manage profiles</Button><Button onClick={() => setCreating(true)}><FolderPlus size={15} />New profile</Button></div></div>
      <div className="pf-grid">{cards.map(c => <button key={c.name} className="pf-card" onClick={() => setOpen(c.name)}>
        <Avatar name={c.name} />
        <span className="pf-main"><b>{c.name}</b><small>{c.count} {c.count === 1 ? "entry" : "entries"} · this month {money(c.month)}</small></span>
        <span className="pf-total num">{money(c.total)}</span><ChevronRight size={16} className="pf-go" />
      </button>)}</div>
    </section>
    {creating && <NewProfile existing={cards.map(c => c.name)} onClose={() => setCreating(false)} onCreate={async name => { await onCreate(name); setCreating(false); setOpen(name); }} />}
    {managing && <Manage profiles={profiles} counts={Object.fromEntries(cards.map(c => [c.name, c.count]))} onClose={() => setManaging(false)} onRename={onRename} onDelete={onDelete} />}
  </>;
}

function NewProfile({ existing, onClose, onCreate }) {
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const submit = async e => {
    e.preventDefault(); const n = name.trim().replace(/\s+/g, " ");
    if (!n) return setErr("Enter a name for the profile.");
    if (existing.some(x => x.toLowerCase() === n.toLowerCase())) return setErr("A profile with this name already exists.");
    setBusy(true); setErr("");
    try { await onCreate(n); } catch (ex) { setErr(ex.message); setBusy(false); }
  };
  return <Modal title="New profile" subtitle="For a person, a site or anything you spend on, e.g. Home, Site A, Ali Raza." onClose={onClose}
    actions={<><Button kind="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" form="new-profile" disabled={busy}><FolderPlus size={15} />Create profile</Button></>}>
    <form id="new-profile" className="form single" onSubmit={submit}>
      <label>Profile name<input autoFocus maxLength={40} value={name} onChange={e => { setName(e.target.value); setErr(""); }} placeholder="e.g. Home" /></label>
      {err && <div className="form-error" role="alert">{err}</div>}
    </form>
  </Modal>;
}

function Manage({ profiles, counts, onClose, onRename, onDelete }) {
  const [editId, setEditId] = useState(null), [val, setVal] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const run = async fn => { setBusy(true); setErr(""); try { await fn(); } catch (ex) { setErr(ex.message); } finally { setBusy(false); } };
  return <Modal title="Manage profiles" subtitle="Rename or delete your own profiles. Deleting one moves its expenses to “Other”; nothing is lost." onClose={onClose} actions={<Button onClick={onClose}>Done</Button>}>
    {err && <div className="form-error" role="alert" style={{ marginBottom: 12 }}>{err}</div>}
    {profiles.length === 0 && <p className="hint">You have not created any profile yet. Use “New profile” to add one.</p>}
    <ul className="pf-manage">{profiles.map(p => <li key={p.id}>
      <Avatar name={p.name} size={34} />
      {editId === p.id ? <input autoFocus maxLength={40} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && run(async () => { await onRename(p, val); setEditId(null); })} aria-label="New name" /> : <span className="pf-main"><b>{p.name}</b><small>{counts[p.name] || 0} {(counts[p.name] || 0) === 1 ? "entry" : "entries"}</small></span>}
      <span className="pf-actions">{editId === p.id ?
        <><Button kind="ghost" disabled={busy} aria-label="Save name" onClick={() => run(async () => { await onRename(p, val); setEditId(null); })}><Check size={16} /></Button><Button kind="ghost" aria-label="Cancel" onClick={() => setEditId(null)}><X size={16} /></Button></> :
        <><Button kind="ghost" aria-label={`Rename ${p.name}`} onClick={() => { setEditId(p.id); setVal(p.name); setErr(""); }}><Pencil size={15} /></Button>
          <Button kind="ghost" disabled={busy} aria-label={`Delete ${p.name}`} onClick={() => { if (window.confirm(`Delete the profile “${p.name}”? Its ${counts[p.name] || 0} expense(s) will move to “Other”.`)) run(() => onDelete(p)); }}><Trash2 size={15} /></Button></>}</span>
    </li>)}</ul>
    <p className="hint pf-lock"><Lock size={13} /> Built-in profiles ({CATEGORIES.join(", ")}) cannot be renamed or deleted.</p>
  </Modal>;
}

function ProfileDetail({ profile, rows, onBack, onAdd, onRemove, notify, company }) {
  const [f, setF] = useState({ title: "", payee: "", payeeType: "Employee", amount: "", date: toInputDate() }), [busy, setBusy] = useState(false), [all, setAll] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!f.title.trim()) return notify("Enter what the expense was for.", true);
    if (!(Number(f.amount) > 0)) return notify("Enter an amount greater than zero.", true);
    setBusy(true);
    try { await onAdd({ ...f, title: f.title.trim(), payee: f.payee.trim(), amount: Number(f.amount), category: profile.name, method: "Cash" }); setF(x => ({ ...x, title: "", amount: "" })); notify("Expense added"); }
    catch (ex) { notify(ex.message, true); } finally { setBusy(false); }
  };
  const shown = all ? rows : rows.slice(0, 10);
  const download = () => exportExpenses({ rows, business: company, title: "Profile Statement", kind: "Expense profile", filters: [profile.name], fileName: `${company}-Profile-${profile.name}` }).catch(() => notify("Could not create the Excel file.", true));
  return <>
    <section className="panel">
      <div className="pf-head">
        <Button kind="ghost" onClick={onBack}><ArrowLeft size={15} />All profiles</Button>
        <div className="pf-title"><Avatar name={profile.name} size={52} /><div><h3>{profile.name}</h3><p>{profile.count} {profile.count === 1 ? "entry" : "entries"} · this month {money(profile.month)}</p></div></div>
        <div className="pf-sum"><small>Total spent</small><b className="num">{money(profile.total)}</b></div>
        <Button kind="outline" onClick={download} disabled={!rows.length}><Download size={15} />Download Excel</Button>
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>Add an expense to {profile.name}</h3><p>It counts in the monthly report like any other expense.</p></div></div>
      <form className="form expense-form" onSubmit={submit}>
        <label>What for<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Labour for plaster work" /></label>
        <label>Paid to <em>optional</em><input value={f.payee} onChange={e => setF({ ...f, payee: e.target.value })} placeholder="e.g. Ali Raza" /></label>
        <label>Person is a<select value={f.payeeType} onChange={e => setF({ ...f, payeeType: e.target.value })}>{PAYEE_TYPES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Amount (Rs)<input type="number" min="0" step="any" inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
        <div className="swap"><Button type="submit" disabled={busy}><Plus size={15} />Add expense</Button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>All expenses in {profile.name}</h3><p>{rows.length} {rows.length === 1 ? "entry" : "entries"} · <b className="num">{money(profile.total)}</b></p></div></div>
      {rows.length === 0 ? <Empty title="No expenses yet" text={`Add the first expense to ${profile.name} above.`} /> :
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Paid to</th><th>Title</th><th className="r">Amount</th><th className="r"><span className="sr">Delete</span></th></tr></thead>
          <tbody>{shown.map(r => <tr key={r.id}><td>{fmtDate(r.d)}</td><td>{r.payee ? <><b>{r.payee}</b><small>{r.payeeType}</small></> : "—"}</td><td><b>{r.title}</b></td><td className="r num"><b>{money(r.amount)}</b></td>
            <td className="r"><Button kind="ghost" aria-label={`Delete ${r.title}`} onClick={async () => { if (!window.confirm(`Delete “${r.title}”?`)) return; try { await onRemove(r.id); notify("Expense deleted"); } catch (ex) { notify(ex.message, true); } }}><Trash2 size={15} /></Button></td></tr>)}</tbody></table></div>}
      {rows.length > 10 && <div className="view-all"><Button kind="ghost" onClick={() => setAll(v => !v)}>{all ? "Show latest 10" : `View all ${rows.length} expenses`}</Button></div>}
    </section>
  </>;
}
