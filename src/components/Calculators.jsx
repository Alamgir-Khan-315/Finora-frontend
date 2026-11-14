import React, { useMemo, useState } from "react";
import { HardHat, CalendarClock } from "lucide-react";
import { money, num as fmtNum, workAmount, permitState, toInputDate } from "../lib";
import { Button } from "./ui";
import WorkOrders, { PermitBadge } from "./WorkOrders";

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const Field = ({ label, hint, ...p }) => <label><span>{label} {hint && <em>{hint}</em>}</span><input type="number" step="any" min="0" {...p} /></label>;
const Stat = ({ label, value, tone }) => <div className={`calc-stat ${tone || ""}`}><small>{label}</small><b className="num">{value}</b></div>;
function ConstructionCalc({ employees, onSave, notify }) {
  const blank = { employee: "", employeePhone: "", site: "", area: "", rate: "", permitNo: "", permitAuthority: "", permitStart: toInputDate(), permitDue: "", notes: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const amount = workAmount(f.area, f.rate);
  const due = f.permitDue ? new Date(f.permitDue + "T00:00:00") : null;
  const state = due ? permitState(due) : null;
  const save = async () => {
    if (!f.employee.trim()) return notify("Enter the employee name.", true);
    if (!f.site.trim()) return notify("Enter the area / site where the work is.", true);
    if (!(amount > 0)) return notify("Enter the area and the rate per sq ft first.", true);
    if (f.permitDue && f.permitStart && f.permitDue < f.permitStart) return notify("Permission due date cannot be before its start date.", true);
    setBusy(true);
    try { await onSave({ employee: f.employee.trim(), employeePhone: f.employeePhone.trim(), site: f.site.trim(), areaSqft: Number(f.area), ratePerSqft: Number(f.rate), permitNo: f.permitNo, permitAuthority: f.permitAuthority, permitStart: f.permitStart || null, permitDue: f.permitDue || null, startedOn: f.permitStart || null, notes: f.notes }); setF(blank); }
    catch (e) { notify(e.message || "Could not save the work.", true); } finally { setBusy(false); }
  };
  return <section className="panel">
    <div className="panel-head"><div><h3>Construction work calculator</h3><p>Enter your rate per square foot and the area you gave to the employee. The amount to pay is worked out for you.</p></div></div>
    <div className="form calc-form four">
      <label><span>Employee</span><input list="emp-list" value={f.employee} onChange={e => set("employee", e.target.value)} placeholder="Name of the employee / contractor" /></label>
      <datalist id="emp-list">{employees.map(n => <option key={n} value={n} />)}</datalist>
      <label><span>Area / site <em>where the work is</em></span><input value={f.site} onChange={e => set("site", e.target.value)} placeholder="e.g. DHA Phase 6, Plot 12" /></label>
      <Field label="Area given" hint="square feet" value={f.area} onChange={e => set("area", e.target.value)} placeholder="e.g. 200" />
      <Field label="Rate" hint="per square foot" value={f.rate} onChange={e => set("rate", e.target.value)} placeholder="e.g. 5000" />
    </div>
    <div className="calc-stats">
      <Stat label="Amount to pay the employee" value={amount > 0 ? money(amount) : "—"} tone="main" />
      <Stat label="Worked out as" value={amount > 0 ? `${fmtNum(f.area)} sq ft × ${fmtNum(f.rate)}` : "area × rate"} />
    </div>

    <div className="permit-box">
      <div className="panel-head"><div><h4><CalendarClock size={16} /> Working permission for this area</h4><p>Officially required to work here. Saved dates show in Needs follow-up before they expire, so you can renew in time.</p></div>
        {state && <PermitBadge permit={state} />}</div>
      <div className="form calc-form four">
        <label><span>Permission no. <em>optional</em></span><input value={f.permitNo} onChange={e => set("permitNo", e.target.value)} placeholder="e.g. BCA-2026-1182" /></label>
        <label><span>Issued by <em>optional</em></span><input value={f.permitAuthority} onChange={e => set("permitAuthority", e.target.value)} placeholder="e.g. Cantonment Board" /></label>
        <label><span>Permission starts</span><input type="date" value={f.permitStart} onChange={e => set("permitStart", e.target.value)} /></label>
        <label><span>Permission due / expires</span><input type="date" value={f.permitDue} min={f.permitStart || undefined} onChange={e => set("permitDue", e.target.value)} /></label>
      </div>
    </div>
    <label className="notes-field"><span>Notes <em>optional</em></span><input value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="e.g. plaster work, 2 floors" /></label>
    <div className="calc-save"><Button onClick={save} disabled={busy}><HardHat size={15} />{busy ? "Saving…" : "Save work order"}</Button></div>
  </section>;
}

export default function Calculators({ works = [], employees = [], onSaveWork, onRenewWork, onWorkStatus, onDeleteWork, onBillWork, notify }) {
  return <div className="page-gap">
    <ConstructionCalc employees={employees} onSave={onSaveWork} notify={notify} />
    <WorkOrders works={works} onRenew={onRenewWork} onStatus={onWorkStatus} onDelete={onDeleteWork} onBill={onBillWork} notify={notify} />
  </div>;
}
