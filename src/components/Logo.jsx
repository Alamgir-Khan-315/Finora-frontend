import React from "react";

// The business logo (round). Files live in /public: logo.png (UI), logo-512.png (invoices), favicon.ico etc.
export default function Logo({ size = 32 }) {
  return <img className="logo-img" src={`${import.meta.env.BASE_URL}logo.png`} width={size} height={size} alt="Business logo" draggable="false" />;
}
