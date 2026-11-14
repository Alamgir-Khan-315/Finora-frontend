import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Status({ value }) {
  return <span className={`status status-${value.toLowerCase()}`}><i />{value}</span>;
}

export function Button({ kind = "primary", children, ...props }) {
  return <button className={`btn btn-${kind}`} {...props}>{children}</button>;
}

export function Modal({ title, subtitle, onClose, children, actions, wide }) {
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Keep the page behind the pop-up from scrolling while it is open.
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, []);
  // Rendered straight into <body> so it is always centred on the phone / laptop screen. Inside the page, the page-enter
  // animation made "position: fixed" relative to the page (not the screen), which put the pop-up in the middle of a long page.
  return createPortal(
    <div className="backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Empty({ title, text, action }) {
  return <div className="empty"><b>{title}</b><p>{text}</p>{action}</div>;
}

// Counts a number up from 0 (or its previous value) so figures feel alive when data loads.
export function useCountUp(target, ms = 900) {
  const [val, setVal] = React.useState(0);
  const from = React.useRef(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setVal(target); return; }
    const start = performance.now(), a = from.current;
    let raf;
    const tick = now => {
      const t = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - t, 3);
      const v = a + (target - a) * e; from.current = v; setVal(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}
export function Count({ value, format = v => v, ms }) { return <>{format(useCountUp(value, ms))}</>; }

// Live date + time that ticks every second.
export function Clock() {
  const [now, setNow] = React.useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return <div className="clock" aria-label={`${date}, ${time}`}>
    <span className="clock-date">{date}</span>
    <time className="clock-time num" dateTime={now.toISOString()}>{time}</time>
  </div>;
}

// Pill-style switcher, e.g. This month | Last 30 days | This year | All data.
export function Segmented({ value, onChange, options, label }) {
  return <div className="segmented" role="radiogroup" aria-label={label}>
    {options.map(([k, text]) => <button key={k} role="radio" aria-checked={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{text}</button>)}
  </div>;
}
