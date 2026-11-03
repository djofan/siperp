export const certificateTemplates = {
  "kebutuhan-pokok": "Kebutuhan Pokok",
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
} as const;
export type CertificateTemplate = keyof typeof certificateTemplates;
export interface CertificateValues { template: CertificateTemplate; recipient: string; verifier: string; amount: number; date: string }

export async function createCertificate(values: CertificateValues, templateBytes: ArrayBuffer | Uint8Array) {
  if (!values.recipient.trim() || !values.verifier.trim() || !Number.isSafeInteger(values.amount) || values.amount < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) throw new Error("Lengkapi nama, nominal, dan tanggal sertifikat.");
  const date = new Date(values.date + "T12:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== values.date) throw new Error("Tanggal sertifikat tidak valid.");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const green = rgb(0, .38, .08);
  const scaleX = page.getWidth() / 842, scaleY = page.getHeight() / 595;
  const centered = (text: string, center: number, y: number, width: number, size: number, bold = true) => {
    const face = bold ? font : regular;
    let fitted = size * scaleX;
    while (face.widthOfTextAtSize(text, fitted) > width * scaleX && fitted > 6 * scaleX) fitted -= .25;
    if (face.widthOfTextAtSize(text, fitted) > width * scaleX) throw new Error("Nama terlalu panjang untuk template. Gunakan nama yang lebih singkat.");
    page.drawText(text, { x: center * scaleX - face.widthOfTextAtSize(text, fitted) / 2, y: y * scaleY, size: fitted, font: face, color: green });
  };
  centered("Rp " + values.amount.toLocaleString("id-ID"), 421, 265, 690, 76);
  centered(values.verifier.trim(), 215, 118, 240, 12);
  centered(values.recipient.trim(), 495, 118, 245, 12);
  centered("TANGGAL PENERIMAAN", 699, 211, 120, 8);
  centered(date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }), 699, 174, 120, 11, false);
  pdf.setTitle("Sertifikat penyerahan bantuan " + certificateTemplates[values.template]);
  pdf.setSubject("Bukti penyerahan bantuan LAZSIP");
  return pdf.save();
}
