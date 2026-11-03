/** Wrap a rendered JPEG in a single-page PDF, without sending private card data to a server. */
export function cardPdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets = [0];
  let length = 0;
  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    parts.push(bytes); length += bytes.length;
  };
  const object = (id: number, value: string) => { offsets[id] = length; append(`${id} 0 obj\n${value}\nendobj\n`); };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842.25 595.5] /Resources << /XObject << /Card 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg); append("\nendstream\nendobj\n");
  const content = "q\n842.25 0 0 595.5 0 0 cm\n/Card Do\nQ\n";
  object(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
  const xref = length;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id++) append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}
