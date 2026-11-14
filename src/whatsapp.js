import { money, fmtDate, waNumber, prettyPhone, isOpen, siteOf } from "./lib";
import { renderInvoiceImage } from "./invoiceImage";

export function invoiceMessage(inv, company) {
  if (inv.kind === "bill") return [`Hello ${inv.customer},`, `Payment update from ${company} for "${inv.service}".`, `Total agreed: ${money(inv.amount)}`, `Paid so far: ${money(inv.paidAmount)}`, inv.balance > 0 ? `Remaining: ${money(inv.balance)}${inv.dueDate ? ` (due ${fmtDate(inv.dueDate)})` : ""}` : "Status: PAID IN FULL", "Thank you."].join("\n");
  const open = isOpen(inv);
  const site = siteOf(inv);
  return [`Hello ${inv.customer},`, `Here is your invoice ${inv.id} from ${company}.`, site ? `Site: ${site}` : "",
    open ? (inv.paidAmount > 0 ? `Invoice total: ${money(inv.amount)}. Received: ${money(inv.paidAmount)}. Amount due: ${money(inv.balance)}${inv.dueDate ? ` (due ${fmtDate(inv.dueDate)})` : ""}.` : `Amount due: ${money(inv.amount)}${inv.dueDate ? ` (due ${fmtDate(inv.dueDate)})` : ""}.`) : inv.status === "Paid" ? `Amount: ${money(inv.amount)}. Paid, thank you!` : `Amount: ${money(inv.amount)}.`,
    "Thank you for your business."].filter(Boolean).join("\n");
}
export const waLink = (inv, company) => `https://wa.me/${waNumber(inv.customerPhone)}?text=${encodeURIComponent(invoiceMessage(inv, company))}`;

// Only used by the "Picture" button: files are saved when the user asks for it, never automatically.
export async function downloadInvoiceImage(inv, company) {
  const blob = await renderInvoiceImage(inv, company);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `${inv.id}.png` });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const canShareFiles = () => { try { return !!navigator.canShare && navigator.canShare({ files: [new File(["x"], "a.png", { type: "image/png" })] }); } catch { return false; } };
export const canSharePicture = canShareFiles;
const whoIs = inv => inv.customerPhone ? `${inv.customer} (${prettyPhone(inv.customerPhone)})` : inv.customer;

// Phones and tablets (including iPadOS, which reports itself as a Mac with a touch screen).
export const isMobileDevice = () => {
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || navigator.userAgentData?.mobile === true || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

// Mobile: jump straight into the WhatsApp app on the client's chat with the URL scheme (no share sheet, no browser page).
// If the app does not take over within ~1.6 s (not installed / Business app), fall back to the https://wa.me link.
export function openWhatsAppApp(number, text) {
  const query = `phone=${number}&text=${encodeURIComponent(text)}`;
  let left = false;
  const leave = () => { if (document.hidden) left = true; };
  document.addEventListener("visibilitychange", leave); window.addEventListener("pagehide", leave);
  window.location.href = `whatsapp://send?${query}`;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", leave); window.removeEventListener("pagehide", leave);
    if (!left && !document.hidden) window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }, 1600);
}

// WhatsApp button:
//  Phone/tablet: copies the invoice picture, then opens the WhatsApp app directly on that client's chat (URL scheme).
//  Computer:     copies the picture, then opens that client's chat on WhatsApp Web / Desktop (wa.me) in a new tab.
// In both cases the message is already typed. Paste the picture (press-and-hold > Paste on a phone, Ctrl+V on a computer) and Send.
// Browsers do not let a website paste into another app or press Send, so those last two taps stay with you. Nothing is downloaded.
export async function sendInvoiceOnWhatsApp(inv, company) {
  const number = waNumber(inv.customerPhone);
  if (!number) throw new Error("Add the client's WhatsApp number first so the right chat opens.");
  const mobile = isMobileDevice();
  const win = mobile ? null : window.open("about:blank", "_blank");   // opened inside the click so pop-up blockers allow it
  const rendering = renderInvoiceImage(inv, company);
  let copied = false;
  try { await navigator.clipboard.write([new ClipboardItem({ "image/png": rendering })]); copied = true; } catch {}
  await rendering;
  if (mobile) openWhatsAppApp(number, invoiceMessage(inv, company));
  else { const url = waLink(inv, company); if (win) win.location.href = url; else window.open(url, "_blank"); }
  const paste = mobile ? "press and hold in the message box and choose Paste" : "press Ctrl+V";
  return copied
    ? `Invoice picture copied and ${whoIs(inv)}'s chat opened. In the chat ${paste} to attach it, then Send.`
    : `${whoIs(inv)}'s chat opened with the message. The picture could not be copied, so use the Picture button and attach it with the paperclip.`;
}

// Phone/tablet helper: share sheet with the picture AND message together. You pick the chat yourself there.
export async function shareInvoicePicture(inv, company) {
  const blob = await renderInvoiceImage(inv, company);
  const data = { files: [new File([blob], `${inv.id}.png`, { type: "image/png" })], text: invoiceMessage(inv, company), title: `Invoice ${inv.id}` };
  if (!navigator.canShare?.(data)) throw new Error("This browser cannot share pictures. Use the WhatsApp button instead.");
  try { await navigator.share(data); return `Choose WhatsApp, then ${inv.customer}.`; }
  catch (e) { if (e?.name === "AbortError") return ""; throw e; }
}

// Opens the customer's chat with a ready message (used when the server could not send the WhatsApp update by itself).
export function openChatWithText(number, text) {
  const n = waNumber(number);
  if (!n) return;
  if (isMobileDevice()) openWhatsAppApp(n, text);
  else window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank");
}
