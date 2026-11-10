import { money, fmtDate, waNumber, prettyPhone } from "./lib";
import { renderInvoiceImage } from "./invoiceImage";

export function invoiceMessage(inv, company) {
  const open = inv.status === "Pending" || inv.status === "Overdue";
  return [`Hello ${inv.customer},`, `Here is your invoice ${inv.id} from ${company}.`,
    open ? `Amount due: ${money(inv.amount)}${inv.dueDate ? ` (due ${fmtDate(inv.dueDate)})` : ""}.` : inv.status === "Paid" ? `Amount: ${money(inv.amount)}. Paid, thank you!` : `Amount: ${money(inv.amount)}.`,
    "Thank you for your business."].join("\n");
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

const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// WhatsApp button:
//  Computer: copies the invoice picture to the clipboard and opens that client's WhatsApp chat with the message already
//            typed in. Press Ctrl+V to attach the picture, then Send.
//  Phone/tablet: pasting pictures is unreliable there, so it opens the share sheet with the picture and message together.
// Browsers do not let a website paste into another app or press Send, so Ctrl+V and Send stay with you.
// Nothing is downloaded. Returns a short message for the user ("" = nothing to say, e.g. they cancelled).
export async function sendInvoiceOnWhatsApp(inv, company) {
  const message = invoiceMessage(inv, company);
  const who = inv.customerPhone ? `${inv.customer} (${prettyPhone(inv.customerPhone)})` : inv.customer;

  if (isPhone() && canShareFiles()) {
    const blob = await renderInvoiceImage(inv, company);
    const data = { files: [new File([blob], `${inv.id}.png`, { type: "image/png" })], text: message, title: `Invoice ${inv.id}` };
    if (navigator.canShare(data)) {
      try { await navigator.share(data); return `Choose WhatsApp, then ${who}. The invoice picture and message go together.`; }
      catch (e) { if (e?.name === "AbortError") return ""; /* other errors: use the chat method below */ }
    }
  }

  const win = window.open("about:blank", "_blank");          // opened inside the click so pop-up blockers allow it
  const rendering = renderInvoiceImage(inv, company);
  let copied = false;
  try { await navigator.clipboard.write([new ClipboardItem({ "image/png": rendering })]); copied = true; } catch {}
  await rendering;
  const url = waLink(inv, company);
  if (win) win.location.href = url; else window.open(url, "_blank");
  return copied
    ? `Invoice picture copied and ${who}'s chat opened. Press Ctrl+V in the chat to attach it, then Send.`
    : `Chat opened with the message. The picture could not be copied, so use the Picture button and attach it with the paperclip.`;
}
