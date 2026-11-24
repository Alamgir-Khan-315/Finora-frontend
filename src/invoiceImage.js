import { money, fmtDate, prettyPhone, loadLogo, siteOf, isOpen, docLabels } from "./lib";

// Draws the invoice as a PNG (always light "paper" style, independent of day/night mode) so it can be sent as a picture.
export async function renderInvoiceImage(inv, company = "Finora Services") {
  try { await document.fonts?.ready; } catch {}
  const logo = await loadLogo(); const L = docLabels(inv);
  const W = 900, S = 2, M = 56;
  const FONT = '"Figtree", "Segoe UI", Roboto, Arial, sans-serif', HEAD = '"Bricolage Grotesque", "Figtree", "Segoe UI", Arial, sans-serif';
  const ink = "#0e1530", soft = "#78829f", line = "#e3e7f1", brand = "#4338ca", paper = "#f4f6fb";
  const statusColor = { Paid: "#0b8f63", Partial: "#2563eb", Pending: "#c27b0a", Overdue: "#d13a3a", Cancelled: "#78829f" }[inv.status] || soft;

  const measure = document.createElement("canvas").getContext("2d");
  const wrap = (text, font, maxW) => {
    measure.font = font; const out = [];
    String(text).split("\n").forEach(par => { let cur = ""; par.split(/\s+/).forEach(w => { const t = cur ? `${cur} ${w}` : w; if (measure.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); out.push(cur); });
    return out;
  };
  const notes = inv.notes ? wrap(inv.notes, `400 17px ${FONT}`, W - 2 * M) : [];
  const site = siteOf(inv), part = isOpen(inv) && inv.paidAmount > 0, extraTop = site ? 30 : 0, extraRow = part ? 34 : 0;
  const H = 880 + extraTop + extraRow + (notes.length ? 40 + notes.length * 26 : 0);

  const c = document.createElement("canvas"); c.width = W * S; c.height = H * S;
  const g = c.getContext("2d"); g.scale(S, S); g.textBaseline = "alphabetic";
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  const text = (t, x, y, font, color, align = "left") => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(String(t), x, y); };

  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  // header band
  g.fillStyle = ink; g.fillRect(0, 0, W, 150);
  if (logo) g.drawImage(logo, M, 38, 76, 76);
  text(company, M + 96, 76, `700 26px ${HEAD}`, "#fff"); text(L.sub, M + 96, 100, `400 15px ${FONT}`, "#aab2c8");
  text(L.title, W - M, 80, `800 ${inv.kind === "bill" ? 30 : 38}px ${HEAD}`, "#fff", "right"); text(inv.id, W - M, 108, `500 17px ${FONT}`, "#aab2c8", "right");

  // meta
  const meta = [["Issue date", fmtDate(inv.date)], ["Due date", fmtDate(inv.dueDate)], ["Payment method", inv.paidAmount > 0 ? (inv.payments.length > 1 ? "Multiple payments" : inv.method) : "Not paid yet"]];
  meta.forEach(([k, v], i) => { const x = M + i * 200; text(k, x, 200, `500 14px ${FONT}`, soft); text(v, x, 228, `700 18px ${FONT}`, ink); });
  const pill = inv.status.toUpperCase(); g.font = `700 14px ${FONT}`; const pw = g.measureText(pill).width + 36;
  g.fillStyle = statusColor; rr(W - M - pw, 200, pw, 34, 17); g.fill(); text(pill, W - M - pw / 2, 222, `700 14px ${FONT}`, "#fff", "center");

  g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.moveTo(M, 268); g.lineTo(W - M, 268); g.stroke();
  // bill to
  text(L.party, M, 306, `500 14px ${FONT}`, soft); text(inv.customer, M, 338, `700 26px ${HEAD}`, ink);
  let y = 338;
  if (inv.customerEmail) { y += 28; text(inv.customerEmail, M, y, `400 16px ${FONT}`, soft); }
  if (inv.customerPhone) { y += 26; text(`WhatsApp: ${prettyPhone(inv.customerPhone)}`, M, y, `400 16px ${FONT}`, soft); }

  if (site) { y += 26; text(`Site: ${site}`, M, y, `400 16px ${FONT}`, soft); }

  // line item
  const ty = 430 + extraTop; g.fillStyle = paper; g.fillRect(M, ty, W - 2 * M, 44);
  text("DESCRIPTION", M + 16, ty + 28, `700 13px ${FONT}`, soft); text("QTY", W - M - 190, ty + 28, `700 13px ${FONT}`, soft, "right"); text("AMOUNT", W - M - 16, ty + 28, `700 13px ${FONT}`, soft, "right");
  text(inv.service || "Service", M + 16, ty + 84, `700 19px ${FONT}`, ink); text("1", W - M - 190, ty + 84, `400 19px ${FONT}`, ink, "right"); text(money(inv.amount), W - M - 16, ty + 84, `600 19px ${FONT}`, ink, "right");
  g.strokeStyle = line; g.beginPath(); g.moveTo(M, ty + 112); g.lineTo(W - M, ty + 112); g.stroke();

  // totals
  const open = isOpen(inv), due = open ? inv.balance : 0;
  text("Subtotal", W - M - 280, ty + 156, `400 17px ${FONT}`, soft); text(money(inv.amount), W - M - 16, ty + 156, `500 17px ${FONT}`, ink, "right");
  if (part) { text(L.received, W - M - 280, ty + 190, `400 17px ${FONT}`, soft); text("- " + money(inv.paidAmount), W - M - 16, ty + 190, `500 17px ${FONT}`, ink, "right"); }
  const by = ty + 176 + extraRow;
  g.fillStyle = ink; rr(W - M - 320, by, 320, 66, 14); g.fill();
  text(open ? L.due : inv.status === "Paid" ? L.paid : "Cancelled", W - M - 300, by + 40, `500 16px ${FONT}`, "#c8cee0");
  text(money(due || inv.amount), W - M - 20, by + 42, `700 26px ${HEAD}`, "#fff", "right");

  if (notes.length) { const ny = ty + 290 + extraRow; text("Notes", M, ny, `500 14px ${FONT}`, soft); notes.forEach((l, i) => text(l, M, ny + 28 + i * 26, `400 17px ${FONT}`, ink)); }
  if (inv.status === "Paid" || part) { g.save(); g.translate(M + 130, ty + 240); g.rotate(-0.21); g.globalAlpha = .22; g.strokeStyle = statusColor; g.lineWidth = 5; rr(-105, -42, 210, 74, 12); g.stroke(); text(part ? "PARTIAL" : "PAID", 0, 14, `800 ${part ? 40 : 52}px ${HEAD}`, statusColor, "center"); g.restore(); }

  // footer
  g.strokeStyle = line; g.beginPath(); g.moveTo(M, H - 80); g.lineTo(W - M, H - 80); g.stroke();
  text("Thank you for your business.", M, H - 42, `400 16px ${FONT}`, soft); text(`${company}  |  ${inv.id}`, W - M, H - 42, `400 16px ${FONT}`, soft, "right");

  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("Could not create the invoice image.")), "image/png"));
}
