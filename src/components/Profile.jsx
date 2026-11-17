import React from "react";
import { ChevronLeft } from "lucide-react";

// Shared "profile" screen (like a contact card in a phone app): back button, big header, stat tiles, action buttons, then content.
export function Profile({ onBack, backLabel, avatar, title, subtitle, chips = null, headAction = null, stats = [], actions, children }) {
  return <div className="profile">
    <button className="back-btn" onClick={onBack}><ChevronLeft size={19} />{backLabel}</button>
    <section className="profile-head">
      <span className="profile-avatar">{avatar}</span>
      <div className="profile-id"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {chips && <div className="profile-chips">{chips}</div>}
      {headAction && <div className="profile-head-action">{headAction}</div>}
    </section>
    <div className="profile-stats">{stats.map(([label, value, tone]) => <div key={label} className={`pstat ${tone || ""}`}><small>{label}</small><b className="num">{value}</b></div>)}</div>
    {actions && <div className="profile-actions">{actions}</div>}
    {children}
  </div>;
}
export const initials = name => String(name || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
