// Expense profiles: every category (Rent, Labour...) is a profile, and you can add your own (a person, a site, "Home"...).
export const CATEGORIES = ["Rent", "Utilities", "Salaries", "Labour", "Materials", "Permits", "Marketing", "Software", "Travel", "Supplies", "Other"];
export const PAYEE_TYPES = ["Employee", "Seller", "Contractor", "Other"];

const PALETTE = ["#4338ca", "#0f9d73", "#d6247a", "#8b5cf6", "#0e8fb0", "#e0921a", "#2f9e44", "#c2410c"];
const FIXED = { Rent: "#0f9d73", Utilities: "#e0921a", Salaries: "#4338ca", Labour: "#7b8499", Materials: "#8b5cf6", Permits: "#4338ca", Marketing: "#d6247a", Software: "#7b8499", Travel: "#e0921a", Supplies: "#0e8fb0", Other: "#4338ca" };
export const profileColor = name => {
  if (FIXED[name]) return FIXED[name];
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
export const initialOf = name => (String(name).trim()[0] || "?").toUpperCase();
