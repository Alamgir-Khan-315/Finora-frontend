import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, UserRound, Info } from "lucide-react";
import Contact from "./Contact";
import About from "./About";

const TABS = [["dev", "Developer", UserRound], ["about", "About software", Info]];

// Phone-only bottom sheet opened from the (i) button in the header. Two tabs: Developer (contact) and About software.
export default function InfoSheet({ company, portfolio, onClose }) {
  const [closing, setClosing] = useState(false), [tab, setTab] = useState("dev");
  const close = () => { setClosing(true); setTimeout(onClose, 220); };
  useEffect(() => {
    const onKey = e => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = old; };
  }, []);
  const idx = TABS.findIndex(t => t[0] === tab);
  return createPortal(
    <div className={`sheet-backdrop ${closing ? "out" : ""}`} onMouseDown={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Info" onMouseDown={e => e.stopPropagation()}>
        <span className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>Info</h2>
          <button className="icon-btn" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="sheet-tabs" role="tablist" style={{ "--i": idx }}>
          <i aria-hidden="true" />
          {TABS.map(([key, label, Icon]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}><Icon size={15} />{label}</button>)}
        </div>
        <div className="sheet-body page-gap" key={tab} role="tabpanel">
          {tab === "dev" ? <Contact portfolio={portfolio} /> : <About company={company} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
