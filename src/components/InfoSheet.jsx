import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, UserRound, Info } from "lucide-react";
import Contact from "./Contact";
import About from "./About";

// Phone-only bottom sheet opened from the (i) button in the header: developer contact first, About Finora below it.
export default function InfoSheet({ company, portfolio, onClose, onRefresh, loading }) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  useEffect(() => {
    const onKey = e => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = old; };
  }, []);
  return createPortal(
    <div className={`sheet-backdrop ${closing ? "out" : ""}`} onMouseDown={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="About and developer" onMouseDown={e => e.stopPropagation()}>
        <span className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>Info</h2>
          <div className="sheet-head-actions">
            <button className="icon-btn" onClick={onRefresh} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
            <button className="icon-btn" onClick={close} aria-label="Close"><X size={18} /></button>
          </div>
        </div>
        <div className="sheet-body page-gap">
          <h3 className="sheet-title"><UserRound size={16} /> Contact (developer)</h3>
          <Contact portfolio={portfolio} />
          <h3 className="sheet-title"><Info size={16} /> About Finora</h3>
          <About company={company} />
        </div>
      </div>
    </div>,
    document.body
  );
}
