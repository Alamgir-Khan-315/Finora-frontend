import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { RefreshCw, ArrowLeftRight } from "lucide-react";
import { money } from "../lib";
import { Button } from "./ui";

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const Field = ({ label, hint, ...p }) => <label><span>{label} {hint && <em>{hint}</em>}</span><input type="number" step="any" min="0" {...p} /></label>;
const Stat = ({ label, value, tone }) => <div className={`calc-stat ${tone || ""}`}><small>{label}</small><b className="num">{value}</b></div>;
const kfmt = v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v;

// ---- pure maths (exported for tests) ----
export function emi(principal, annualRate, months) {
  if (!(principal > 0) || !(months > 0) || annualRate < 0) return null;
  const r = annualRate / 12 / 100;
  const pay = r === 0 ? principal / months : principal * r * (1 + r) ** months / ((1 + r) ** months - 1);
  return { payment: pay, total: pay * months, interest: pay * months - principal };
}
export function growth({ principal, monthly, annualRate, years }) {
  const r = annualRate / 12 / 100, rows = [];
  let bal = principal, put = principal;
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + monthly; put += monthly;
    if (m % 12 === 0) rows.push({ year: m / 12, invested: Math.round(put), value: Math.round(bal) });
  }
  return { rows, final: bal, invested: put, gain: bal - put };
}

function EmiCalc() {
  const [p, setP] = useState("1000000"), [rate, setRate] = useState("15"), [n, setN] = useState("36");
  const res = useMemo(() => emi(num(p), num(rate), num(n)), [p, rate, n]);
  const [showAll, setShowAll] = useState(false);
  const schedule = useMemo(() => {
    if (!res) return [];
    let bal = num(p); const r = num(rate) / 1200, out = [];
    for (let i = 1; i <= num(n); i++) { const int = bal * r, prin = res.payment - int; bal = Math.max(0, bal - prin); out.push({ i, int, prin, bal }); }
    return out;
  }, [res, p, rate, n]);
  return <section className="panel">
    <div className="panel-head"><div><h3>Loan / EMI calculator</h3><p>Monthly repayment from amount, yearly interest rate and tenure.</p></div></div>
    <div className="form calc-form"><Field label="Loan amount (Rs)" value={p} onChange={e => setP(e.target.value)} /><Field label="Interest rate" hint="% per year" value={rate} onChange={e => setRate(e.target.value)} /><Field label="Tenure" hint="months" value={n} onChange={e => setN(e.target.value)} /></div>
    {res ? <><div className="calc-stats"><Stat label="Monthly EMI" value={money(res.payment)} tone="main" /><Stat label="Total interest" value={money(res.interest)} /><Stat label="Total payable" value={money(res.total)} /></div>
      <Button kind="ghost" onClick={() => setShowAll(x => !x)}>{showAll ? "Hide" : "Show"} repayment schedule</Button>
      {showAll && <div className="table-wrap"><table><thead><tr><th>Month</th><th className="r">Principal</th><th className="r">Interest</th><th className="r">Balance</th></tr></thead>
        <tbody>{schedule.map(r => <tr key={r.i}><td>{r.i}</td><td className="r num">{money(r.prin)}</td><td className="r num">{money(r.int)}</td><td className="r num">{money(r.bal)}</td></tr>)}</tbody></table></div>}</>
      : <p className="hint">Enter an amount and tenure above zero.</p>}
  </section>;
}

function GrowthCalc() {
  const [f, setF] = useState({ principal: "100000", monthly: "10000", rate: "12", years: "10" });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const ok = num(f.principal) >= 0 && num(f.monthly) >= 0 && num(f.rate) >= 0 && num(f.years) > 0 && num(f.years) <= 60 && (num(f.principal) > 0 || num(f.monthly) > 0);
  const g = useMemo(() => ok ? growth({ principal: num(f.principal), monthly: num(f.monthly), annualRate: num(f.rate), years: Math.floor(num(f.years)) }) : null, [f, ok]);
  return <section className="panel">
    <div className="panel-head"><div><h3>Investment & compound interest</h3><p>SIP / retirement growth with monthly compounding.</p></div></div>
    <div className="form calc-form four">
      <Field label="Starting amount (Rs)" value={f.principal} onChange={e => set("principal", e.target.value)} />
      <Field label="Monthly investment (Rs)" value={f.monthly} onChange={e => set("monthly", e.target.value)} />
      <Field label="Expected return" hint="% per year" value={f.rate} onChange={e => set("rate", e.target.value)} />
      <Field label="Years" hint="max 60" value={f.years} onChange={e => set("years", e.target.value)} />
    </div>
    {g ? <><div className="calc-stats"><Stat label="Future value" value={money(g.final)} tone="main" /><Stat label="You invest" value={money(g.invested)} /><Stat label="Growth earned" value={money(g.gain)} tone="good" /></div>
      <div className="chart-box short"><ResponsiveContainer width="100%" height="100%"><AreaChart data={g.rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="year" tickFormatter={v => `Y${v}`} axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
        <YAxis width={48} axisLine={false} tickLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11 }} tickFormatter={kfmt} />
        <Tooltip formatter={v => money(v)} labelFormatter={v => `Year ${v}`} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }} />
        <Area dataKey="invested" name="Invested" stroke="var(--ink-3)" fill="var(--line)" /><Area dataKey="value" name="Value" stroke="var(--brand)" fill="var(--brand-soft)" />
      </AreaChart></ResponsiveContainer></div></> : <p className="hint">Enter a positive amount and 1–60 years.</p>}
  </section>;
}

// Offline fallback rates (PKR per 1 unit) used only if the live rate service can't be reached.
const FALLBACK = { USD: 1, PKR: 278, EUR: 0.92, GBP: 0.78, AED: 3.6725, SAR: 3.75, INR: 83, CNY: 7.2, CAD: 1.36, AUD: 1.5, JPY: 150 };
function Currency() {
  const [rates, setRates] = useState(FALLBACK);
  const [meta, setMeta] = useState({ live: false, at: "" });
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("1000"), [from, setFrom] = useState("USD"), [to, setTo] = useState("PKR");
  const load = () => {
    setLoading(true);
    fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).then(d => {
      if (d.result !== "success") throw new Error();
      setRates(d.rates); setMeta({ live: true, at: new Date(d.time_last_update_unix * 1000).toLocaleString("en-GB") });
    }).catch(() => setMeta({ live: false, at: "" })).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const codes = useMemo(() => Object.keys(rates).sort(), [rates]);
  const a = num(amount), out = a >= 0 && rates[from] && rates[to] ? a / rates[from] * rates[to] : NaN;
  return <section className="panel">
    <div className="panel-head"><div><h3>Currency converter</h3><p>{meta.live ? `Live rates · updated ${meta.at}` : "Approximate offline rates — live rates unavailable right now."}</p></div>
      <Button kind="outline" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} />Refresh</Button></div>
    <div className="form calc-form four">
      <Field label="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
      <label><span>From</span><select value={from} onChange={e => setFrom(e.target.value)}>{codes.map(c => <option key={c}>{c}</option>)}</select></label>
      <label><span>To</span><select value={to} onChange={e => setTo(e.target.value)}>{codes.map(c => <option key={c}>{c}</option>)}</select></label>
      <div className="swap"><Button kind="outline" onClick={() => { setFrom(to); setTo(from); }}><ArrowLeftRight size={15} />Swap</Button></div>
    </div>
    <div className="calc-stats"><Stat label={`${amount || 0} ${from} =`} value={Number.isFinite(out) ? `${out.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${to}` : "—"} tone="main" />
      <Stat label="Rate" value={rates[from] && rates[to] ? `1 ${from} = ${(rates[to] / rates[from]).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${to}` : "—"} /></div>
  </section>;
}

export default function Calculators() {
  return <div className="calc-grid"><EmiCalc /><GrowthCalc /><Currency /></div>;
}
