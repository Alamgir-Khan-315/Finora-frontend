// Developer details shown on the "Contact me" tab, in the footer and in Settings.
// The portfolio link is fixed here on purpose, so nobody can point the app at another profile.
// Add `email` or more `links` below if you want them to appear on the Contact me page.
export const CONTACT = {
  name: "Alamgir Khan",
  role: "Frontend Web Developer",
  phone: "03154572266",
  portfolio: "https://portfolio-web-psi-rosy.vercel.app/",
  email: "",
  links: []   // e.g. [{ label: "GitHub", url: "https://github.com/..." }]
};
export const CONTACT_TEL = `tel:${CONTACT.phone}`;
// Pakistan number 03xx... -> international 923xx... for WhatsApp.
export const CONTACT_WA = `https://wa.me/92${CONTACT.phone.replace(/^0/, "")}?text=${encodeURIComponent("Hello, I found you through Finora. I need a website / software.")}`;
