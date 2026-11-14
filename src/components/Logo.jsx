import React from "react";

// Finora logo (bar chart + trend line). Same artwork as /public/favicon.svg, logo*.png and the app icons.
export default function Logo({ size = 32 }) {
  return (
    <svg className="logo-svg" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Finora logo">
      <rect width="32" height="32" rx="9" fill="#2a3bd6" />
      <rect className="bar" x="7" y="17" width="4.5" height="8" rx="1.2" fill="#fff" opacity=".7" />
      <rect className="bar" x="13.75" y="12.5" width="4.5" height="12.5" rx="1.2" fill="#fff" opacity=".85" />
      <rect className="bar" x="20.5" y="8" width="4.5" height="17" rx="1.2" fill="#fff" />
      <path className="trend" d="M6.5 14.5 12 10.5l4.5 2.5 6-6" fill="none" stroke="#3ccf91" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
