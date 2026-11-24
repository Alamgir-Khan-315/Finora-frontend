import React, { useMemo, useState } from "react";
import { ChevronRight, ArrowLeft, FolderPlus, SlidersHorizontal, Download, Plus, Trash2, Pencil, Check, X, Lock } from "lucide-react";
import { money, fmtDate, toInputDate, expenseDate } from "../lib";
import { CATEGORIES, PAYEE_TYPES, profileColor, initialOf } from "../profiles";
import { exportExpenses } from "../exports";
import { Button, Empty, Modal, Status } from "./ui";

const sameMonth = d => { const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); };

function Avatar({ name, size = 46 }) {
  return <span className="pf-avatar" style={{ background: profileColor(name), width: size, height: size, fontSize: size * 0.38 }}>{initialOf(name)}</span>;
}

// The Profiles tab: one card per profile. Open a card to see every expense of that profile and download it as Excel.
export default function Profiles({ expenses, profiles, hiddenProfiles = [], bills = [], onOpenBill, onAdd, onRemove, onCreate, onRename, onDelete, notify, company }) {
  const [open, setOpen] = useState(null), [creating, setCreating] = useState(false), [managing, setManaging] = useState(false);
  const rows = useMemo(() => expenses.map(e => ({ ...e, d: expenseDate(e) })).sort((a, b) => b.d - a.d), [expenses]);
  const custom = useMemo(() => profiles.map(p => p.name), [profiles]);
  const cards = useMemo(() => {
    const names = [...new Set([...CATEGORIES.filter(c => !hiddenProfiles.includes(c)), ...custom, ...rows.map(r => r.category).filter(Boolean)])];
    return names.map(name => {
      const mine = rows.filter(r => r.category === name);
      return { name, count: mine.length, total: mine.reduce((a, r) => a + Number(r.amount), 0), month: mine.filter(r => sameMonth(r.d)).reduce((a, r) => a + Number(r.amount), 0), custom: custom.includes(name) };
    }).sort((a, b) => (b.count > 0) - (a.count > 0) || b.total - a.total || a.name.localeCompare(b.name));
  }, [rows, custom, hiddenProfiles]);

  const current = open && cards.find(c => c.name === open);
  if (current) return <ProfileDetail {...{ profile: current, rows: rows.filter(r => r.category === current.name), bills: bills.filter(b => b.category === current.name), onOpenBill, record: profiles.find(p => p.name === current.name) || (current.name !== "Other" && CATEGORIES.includes(current.name) ? { name: current.name, builtin: true } : null), onBack: () => setOpen(null), onAdd, onRemove, onDelete: async p => { await onDelete(p); setOpen(null); }, notify, company }} />;

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

function ProfileDetail({ profile, rows, bills, onOpenBill, record, onBack, onAdd, onRemove, onDelete, notify, company }) {
  const [tab, setTab] = useState("expenses"), [adding, setAdding] = useState(false), [confirmDel, setConfirmDel] = useState(false);
  const [f, setF] = useState({ title: "", payee: "", payeeType: "Employee", amount: "", date: toInputDate() }), [busy, setBusy] = useState(false), [all, setAll] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!f.title.trim()) return notify("Enter what the expense was for.", true);
    if (!(Number(f.amount) > 0)) return notify("Enter an amount greater than zero.", true);
    setBusy(true);
    try { await onAdd({ ...f, title: f.title.trim(), payee: f.payee.trim(), amount: Number(f.amount), category: profile.name, method: "Cash" }); setF(x => ({ ...x, title: "", amount: "" })); setAdding(false); notify("Expense added"); }
    catch (ex) { notify(ex.message, true); } finally { setBusy(false); }
  };
  const remove = async r => { if (!window.confirm(`Delete “${r.title}”?`)) return; try { await onRemove(r.id); notify("Expense deleted"); } catch (ex) { notify(ex.message, true); } };
  const del = async () => { setBusy(true); try { await onDelete(record); } catch (ex) { notify(ex.message, true); setBusy(false); setConfirmDel(false); } };
  const shown = all ? rows : rows.slice(0, 15);
  const toPay = bills.filter(b => b.balance > 0 && b.status !== "Cancelled").reduce((a, b) => a + b.balance, 0);
  const download = () => exportExpenses({ rows, business: company, title: "Profile Statement", kind: "Expense profile", filters: [profile.name], fileName: `${company}-Profile-${profile.name}` }).catch(() => notify("Could not create the Excel file.", true));
  return <div className="pfd">
    <section className="pfd-hero" style={{ "--pf": profileColor(profile.name) }}>
      <div className="pfd-top">
        <button className="pfd-back" onClick={onBack} aria-label="Back to all profiles"><ArrowLeft size={17} /><span>Profiles</span></button>
        {record ? <button className="pfd-del" onClick={() => setConfirmDel(true)}><Trash2 size={15} />Delete profile</button> : <span className="pfd-lock"><Lock size={13} />Always kept</span>}
      </div>
      <div className="pfd-id"><Avatar name={profile.name} size={60} /><div><h3>{profile.name}</h3><p>Everything you spent under this profile</p></div></div>
    </section>
    <div className="pfd-stats">
      <div><small>Total spent</small><b className="num">{money(profile.total)}</b></div>
      <div><small>This month</small><b className="num">{money(profile.month)}</b></div>
      <div><small>Entries</small><b className="num">{profile.count}</b></div>
      <div><small>Bills to pay</small><b className="num">{toPay > 0 ? money(toPay) : "—"}</b></div>
    </div>
    <div className="pfd-actions">
      <Button onClick={() => setAdding(true)}><Plus size={16} />Add expense</Button>
      <Button kind="outline" onClick={download} disabled={!rows.length}><Download size={16} />Download Excel</Button>
    </div>
    <section className="panel pfd-list">
      <div className="panel-head"><div><h3>{tab === "expenses" ? "Expenses" : "Bills to pay"}</h3><p>{tab === "expenses" ? `${rows.length} ${rows.length === 1 ? "entry" : "entries"} · ${money(profile.total)}` : `${bills.length} ${bills.length === 1 ? "bill" : "bills"} · ${money(toPay)} left to pay`}</p></div></div>
      <div className="segmented pfd-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "expenses"} className={tab === "expenses" ? "on" : ""} onClick={() => setTab("expenses")}>Expenses ({rows.length})</button>
        <button role="tab" aria-selected={tab === "bills"} className={tab === "bills" ? "on" : ""} onClick={() => setTab("bills")}>Bills to pay ({bills.length})</button>
      </div>
      {tab === "expenses" ? (rows.length === 0 ? <Empty title="No expenses yet" text={`Tap “Add expense” to record the first one in ${profile.name}.`} /> :
        <ul className="pfd-items">{shown.map(r => <li key={r.id}>
          <span className="pfd-date"><b>{r.d.getDate()}</b>{r.d.toLocaleString("en-US", { month: "short" })}</span>
          <span className="pfd-main"><b>{r.title}</b><small>{r.payee ? `${r.payee} · ${r.payeeType}` : "No person"}</small></span>
          <span className="pfd-amt num">{money(r.amount)}</span>
          <button className="pfd-trash" aria-label={`Delete ${r.title}`} onClick={() => remove(r)}><Trash2 size={16} /></button>
        </li>)}</ul>)
      : (bills.length === 0 ? <Empty title="No bills" text={`Bills you owe to someone under ${profile.name} will show here.`} /> :
        <ul className="pfd-items">{bills.map(b => <li key={b.id} className="tap" onClick={() => onOpenBill?.(b)}>
          <span className="pfd-date"><b>{b.date.getDate()}</b>{b.date.toLocaleString("en-US", { month: "short" })}</span>
          <span className="pfd-main"><b>{b.customer}</b><small>{b.service}</small></span>
          <span className="pfd-amt num">{money(b.balance > 0 ? b.balance : b.amount)}<Status value={b.status} /></span>
        </li>)}</ul>)}
      {tab === "expenses" && rows.length > 15 && <div className="view-all"><Button kind="ghost" onClick={() => setAll(v => !v)}>{all ? "Show latest 15" : `View all ${rows.length} expenses`}</Button></div>}
    </section>

    {adding && <Modal title={`Add expense`} subtitle={`Goes into ${profile.name} and counts in the monthly report.`} onClose={() => setAdding(false)}
      actions={<><Button kind="outline" type="button" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="pf-add" disabled={busy}><Plus size={15} />Add expense</Button></>}>
      <form id="pf-add" className="form single" onSubmit={submit}>
        <label>What for<input autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Labour for plaster work" /></label>
        <label>Amount (Rs)<input type="number" min="0" step="any" inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>Paid to <em>optional</em><input value={f.payee} onChange={e => setF({ ...f, payee: e.target.value })} placeholder="e.g. Ali Raza" /></label>
        <label>Person is a<select value={f.payeeType} onChange={e => setF({ ...f, payeeType: e.target.value })}>{PAYEE_TYPES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
      </form>
    </Modal>}
    {confirmDel && <Modal title="Delete this profile?" subtitle={`“${profile.name}” will be removed.`} onClose={() => !busy && setConfirmDel(false)}
      actions={<><Button kind="outline" type="button" disabled={busy} onClick={() => setConfirmDel(false)}>Cancel</Button><Button kind="danger" disabled={busy} onClick={del}><Trash2 size={15} />Delete profile</Button></>}>
      <p className="hint">Its {profile.count} {profile.count === 1 ? "expense" : "expenses"} and {bills.length} {bills.length === 1 ? "bill" : "bills"} move to “Other”. No money record is lost.</p>
    </Modal>}
  </div>;
}
