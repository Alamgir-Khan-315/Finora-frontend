import { jsPDF } from "jspdf";
import { money, fmtDate, prettyPhone, loadLogo } from "./lib";

// Draws a clean one-page A4 invoice and saves it as <invoice number>.pdf
export async function downloadInvoicePdf(inv, company = "Finora Services") {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18;
  const ink = [20, 26, 36], soft = [110, 119, 135], line = [227, 229, 222], brand = [42, 59, 214];
  const statusColor = { Paid: [15, 138, 95], Pending: [183, 121, 31], Overdue: [199, 62, 45], Cancelled: [123, 132, 148] }[inv.status] || soft;

  // Header
  doc.setFillColor(...ink); doc.rect(0, 0, W, 44, "F");
  if (logo) {
    const c = document.createElement("canvas"); c.width = c.height = 256; c.getContext("2d").drawImage(logo, 0, 0, 256, 256);
    doc.addImage(c.toDataURL("image/png"), "PNG", M, 11, 20, 20);
  }
  doc.setTextColor(255);
  doc.setFontSize(15); doc.text(company, M + 25, 21);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(170, 178, 192); doc.text("Sales invoice", M + 25, 27);
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text("INVOICE", W - M, 24, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(170, 178, 192); doc.text(inv.id, W - M, 31, { align: "right" });

  // Meta
  const meta = [["Issue date", fmtDate(inv.date)], ["Due date", fmtDate(inv.dueDate)], ["Payment method", inv.status === "Paid" ? inv.method : "Not paid yet"]];
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
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft); doc.text("Bill to", M, 84);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ink); doc.text(inv.customer, M, 92);
  if (inv.customerEmail) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...soft); doc.text(inv.customerEmail, M, 98); }

  if (inv.customerPhone) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...soft); doc.text(`WhatsApp: ${prettyPhone(inv.customerPhone)}`, M, inv.customerEmail ? 104 : 98); }

  // Line item
  doc.setFillColor(245, 246, 243); doc.rect(M, 112, W - 2 * M, 10, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...soft);
  doc.text("Description", M + 4, 118.3); doc.text("Qty", 128, 118.3, { align: "right" }); doc.text("Amount", W - M - 4, 118.3, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...ink); doc.text(inv.service || "Service", M + 4, 133);
  doc.setFont("helvetica", "normal"); doc.text("1", 128, 133, { align: "right" }); doc.text(money(inv.amount), W - M - 4, 133, { align: "right" });
  doc.line(M, 141, W - M, 141);

  // Totals
  const rightX = W - M - 4;
  doc.setFontSize(10); doc.setTextColor(...soft); doc.text("Subtotal", 120, 152); doc.setTextColor(...ink); doc.text(money(inv.amount), rightX, 152, { align: "right" });
  doc.setFillColor(...ink); doc.roundedRect(112, 160, W - M - 112, 16, 3, 3, "F");
  const due = inv.status === "Paid" || inv.status === "Cancelled" ? 0 : inv.amount;
  doc.setTextColor(200, 206, 218); doc.setFontSize(9); doc.text(due ? "Amount due" : inv.status === "Paid" ? "Paid in full" : "Cancelled", 117, 170);
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(money(due || inv.amount), rightX, 170.5, { align: "right" });

  if (inv.notes) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft); doc.text("Notes", M, 160);
    doc.setFontSize(10); doc.setTextColor(...ink); doc.text(doc.splitTextToSize(inv.notes, 85), M, 167);
  }

  doc.setDrawColor(...line); doc.line(M, 270, W - M, 270);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...soft);
  doc.text("Thank you for your business.", M, 278);
  doc.text(`${company}  |  ${inv.id}`, W - M, 278, { align: "right" });
  doc.save(`${inv.id}.pdf`);
}
