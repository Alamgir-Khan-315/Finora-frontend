import { jsPDF } from "jspdf";
import { money, fmtDate, prettyPhone, loadLogo, siteOf, isOpen, docLabels } from "./lib";

// Draws a clean one-page A4 invoice and saves it as <invoice number>.pdf
export async function downloadInvoicePdf(inv, company = "Finora Services") {
  const logo = await loadLogo(); const L = docLabels(inv);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18;
  const ink = [20, 26, 36], soft = [110, 119, 135], line = [227, 229, 222], brand = [42, 59, 214];
  const statusColor = { Paid: [15, 138, 95], Partial: [37, 99, 235], Pending: [183, 121, 31], Overdue: [199, 62, 45], Cancelled: [123, 132, 148] }[inv.status] || soft;

  // Header
  doc.setFillColor(...ink); doc.rect(0, 0, W, 44, "F");
  if (logo) {
    const c = document.createElement("canvas"); c.width = c.height = 256; c.getContext("2d").drawImage(logo, 0, 0, 256, 256);
    doc.addImage(c.toDataURL("image/png"), "PNG", M, 11, 20, 20);
  }
  doc.setTextColor(255);
  doc.setFontSize(15); doc.text(company, M + 25, 21);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(170, 178, 192); doc.text(L.sub, M + 25, 27);
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(inv.kind === "bill" ? 20 : 26); doc.text(L.title, W - M, 24, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(170, 178, 192); doc.text(inv.id, W - M, 31, { align: "right" });

  // Meta
  const meta = [["Issue date", fmtDate(inv.date)], ["Due date", fmtDate(inv.dueDate)], ["Payment method", inv.paidAmount > 0 ? (inv.payments.length > 1 ? "Multiple payments" : inv.method) : L.method]];
  meta.forEach(([k, v], i) => {
    const x = M + i * 58;
    doc.setFontSize(8); doc.setTextColor(...soft); doc.setFont("helvetica", "normal"); doc.text(k, x, 58);
    doc.setFontSize(11); doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.text(String(v), x, 65);
  });

  // Status pill
  doc.setFillColor(...statusColor); doc.roundedRect(W - M - 30, 53, 30, 9, 4.5, 4.5, "F");
  doc.setTextColor(255); doc.setFontSize(9); doc.text(inv.status.toUpperCase(), W - M - 15, 59, { align: "center" });

  // Bill to
  doc.setDrawColor(...line); doc.line(M, 75, W - M, 75);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft); doc.text(L.party, M, 84);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ink); doc.text(inv.customer, M, 92);
  if (inv.customerEmail) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...soft); doc.text(inv.customerEmail, M, 98); }

  if (inv.customerPhone) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...soft); doc.text(`WhatsApp: ${prettyPhone(inv.customerPhone)}`, M, inv.customerEmail ? 104 : 98); }

  const site = siteOf(inv);
  if (site) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...soft); doc.text(doc.splitTextToSize(`Site: ${site}`, W - 2 * M)[0], M, 110 - (inv.customerEmail ? 0 : 6) - (inv.customerPhone ? 0 : 6)); }

  // Line item (shifted 6 mm down to leave room for the site line)
  doc.setFillColor(245, 246, 243); doc.rect(M, 118, W - 2 * M, 10, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...soft);
  doc.text("Description", M + 4, 124.3); doc.text("Qty", 128, 124.3, { align: "right" }); doc.text("Amount", W - M - 4, 124.3, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...ink); doc.text(inv.service || "Service", M + 4, 139);
  doc.setFont("helvetica", "normal"); doc.text("1", 128, 139, { align: "right" }); doc.text(money(inv.amount), W - M - 4, 139, { align: "right" });
  doc.line(M, 147, W - M, 147);

  // Totals
  const rightX = W - M - 4, open = isOpen(inv), due = open ? inv.balance : 0;
  doc.setFontSize(10); doc.setTextColor(...soft); doc.text("Subtotal", 120, 158); doc.setTextColor(...ink); doc.text(money(inv.amount), rightX, 158, { align: "right" });
  let by = 166;
  if (open && inv.paidAmount > 0) { doc.setTextColor(...soft); doc.text(L.received, 120, 165); doc.setTextColor(...ink); doc.text("- " + money(inv.paidAmount), rightX, 165, { align: "right" }); by = 172; }
  doc.setFillColor(...ink); doc.roundedRect(112, by, W - M - 112, 16, 3, 3, "F");
  doc.setTextColor(200, 206, 218); doc.setFontSize(9); doc.text(due ? L.due : inv.status === "Paid" ? L.paid : "Cancelled", 117, by + 10);
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(money(due || inv.amount), rightX, by + 10.5, { align: "right" });

  if (inv.notes) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft); doc.text("Notes", M, 166);
    doc.setFontSize(10); doc.setTextColor(...ink); doc.text(doc.splitTextToSize(inv.notes, 85), M, 173);
  }

  doc.setDrawColor(...line); doc.line(M, 270, W - M, 270);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...soft);
  doc.text("Thank you for your business.", M, 278);
  doc.text(`${company}  |  ${inv.id}`, W - M, 278, { align: "right" });
  doc.save(`${inv.id}.pdf`);
}
