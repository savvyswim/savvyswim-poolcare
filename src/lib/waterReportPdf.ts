import { jsPDF } from "jspdf";
import { evaluate, lsi, lsiVerdict, type Readings } from "@/crm/lib/chem";

const BURGUNDY: [number, number, number] = [142, 31, 44];
const CREAM: [number, number, number] = [244, 239, 227];
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [110, 110, 110];
const AQUA: [number, number, number] = [31, 169, 190];

export type WaterReportInput = {
  address: string;
  city?: string | null;
  customerName: string;
  servicePlan?: string | null;
  gallons: number;
  visitDate: string;
  readings: Readings;
  notes?: string | null;
};

/** Branded one-page water chemistry report. Returns a Blob + suggested filename. */
export function buildWaterReportPdf(input: WaterReportInput): { blob: Blob; filename: string } {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const report = evaluate(input.readings, input.gallons || 0);
  const li = lsi(input.readings);
  const dateLabel = new Date(input.visitDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Header band
  doc.setFillColor(...BURGUNDY);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(...CREAM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("SAVVY SWIM", M, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("ON DUTY, SO YOU DON'T HAVE TO BE.", M, 62);
  doc.setFontSize(9);
  doc.text("WATER CHEMISTRY REPORT", W - M, 46, { align: "right" });
  doc.text(dateLabel.toUpperCase(), W - M, 62, { align: "right" });

  let y = 132;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(input.address || input.customerName, M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    [input.city, input.servicePlan, `${(input.gallons || 0).toLocaleString()} gal`]
      .filter(Boolean)
      .join("  ·  "),
    M,
    y,
  );

  // Verdict block
  y += 26;
  doc.setFillColor(...CREAM);
  doc.rect(M, y, W - M * 2, 52, "F");
  doc.setTextColor(...(report.allGood ? INK : BURGUNDY));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(report.allGood ? "Water balanced — swim away" : "Correction recommended", M + 14, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(report.summary || "", W - M * 2 - 28), M + 14, y + 38);
  y += 76;

  // Readings table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("READINGS", M, y);
  y += 12;
  doc.setDrawColor(220, 216, 208);
  doc.line(M, y, W - M, y);
  y += 16;

  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("METRIC", M, y);
  doc.text("RESULT", M + 210, y);
  doc.text("TARGET", M + 300, y);
  doc.text("STATUS", M + 400, y);
  y += 6;
  doc.line(M, y, W - M, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const m of report.metrics) {
    if (m.value === null) continue;
    doc.setTextColor(...INK);
    doc.text(m.label, M, y);
    doc.text(`${m.value}${m.unit ? ` ${m.unit}` : ""}`, M + 210, y);
    doc.setTextColor(...MUTED);
    doc.text(m.range, M + 300, y);
    doc.setTextColor(...(m.status === "good" ? AQUA : BURGUNDY));
    doc.setFont("helvetica", "bold");
    doc.text(m.status === "good" ? "IN RANGE" : m.status.toUpperCase(), M + 400, y);
    doc.setFont("helvetica", "normal");
    y += 18;
  }

  if (li !== null) {
    y += 4;
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text(`Langelier saturation index ${li.toFixed(2)} — ${lsiVerdict(li)}`, M, y);
    y += 18;
  }

  // Treatments
  if (report.treatments.length) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("TREATMENT APPLIED / RECOMMENDED", M, y);
    y += 12;
    doc.setDrawColor(220, 216, 208);
    doc.line(M, y, W - M, y);
    y += 18;
    doc.setFontSize(9.5);
    for (const t of report.treatments) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(`${t.chemical} — ${t.amount}`, M, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      const lines = doc.splitTextToSize(t.reason, W - M * 2);
      doc.text(lines, M, y);
      y += lines.length * 12 + 8;
    }
  }

  if (input.notes) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("TECHNICIAN NOTES", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(input.notes, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 12;
  }

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 216, 208);
  doc.line(M, H - 62, W - M, H - 62);
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Savvy Swim Pool Care  ·  (469) 744-0379  ·  savvyswim.com", M, H - 44);
  doc.text("Clear Water Guarantee — not clear after a visit, we come back free.", M, H - 32);

  const slug = (input.address || input.customerName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return {
    blob: doc.output("blob"),
    filename: `savvy-swim-water-report-${slug || "pool"}-${input.visitDate}.pdf`,
  };
}
