import React, { useEffect } from "react";
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
  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
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
