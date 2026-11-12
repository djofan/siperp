import type { CellValue } from "exceljs";

export type SantunanImportRow = { recipientName: string; category: "orphan" | "widow"; amount: number };
function text(value: CellValue, row: number): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object" && "richText" in value) return value.richText.map(part => part.text).join("").trim();
  throw new Error(`Baris ${row}: gunakan teks atau angka biasa, tanpa rumus atau tautan.`);
}
export async function readSantunanWorkbook(buffer: ArrayBuffer): Promise<SantunanImportRow[]> {
  const { Workbook } = await import("exceljs");
  const book = new Workbook();
  try { await book.xlsx.load(buffer); } catch { throw new Error("File tidak dapat dibaca. Gunakan Excel .xlsx tanpa password."); }
  const sheets = book.worksheets.filter(sheet => sheet.actualRowCount > 0);
  if (sheets.length !== 1) throw new Error("Gunakan satu lembar data saja.");
  const sheet = sheets[0];
  if (sheet.rowCount > 10001 || sheet.columnCount > 100) throw new Error("Lembar terlalu besar. Gunakan template dengan maksimal 200 penerima.");
  const columns: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, index) => {
    const title = text(cell.value, 1).toLowerCase().replace(/\s+/g, " ");
    if (!["nama", "program", "nominal bantuan"].includes(title)) return;
    if (columns[title]) throw new Error(`Kolom ${title} berulang.`);
    columns[title] = index;
  });
  if (!["nama", "program", "nominal bantuan"].every(key => columns[key])) throw new Error("Baris pertama wajib berisi Nama, Program, Nominal Bantuan.");
  const rows: SantunanImportRow[] = [], seen = new Set<string>();
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const recipientName = text(row.getCell(columns.nama).value, index);
    const program = text(row.getCell(columns.program).value, index).toLowerCase().replace(/\s+/g, " ").replace(/^santunan /, "");
    const raw = text(row.getCell(columns["nominal bantuan"]).value, index);
    if (!recipientName && !program && !raw) return;
    const category = program === "anak yatim" ? "orphan" : program === "janda dhuafa" ? "widow" : null;
    const normalized = raw.replace(/^rp\.?\s*/i, "");
    const amount = /^\d+$/.test(normalized) ? Number(normalized) : /^\d{1,3}(\.\d{3})+(,00)?$/.test(normalized) ? Number(normalized.replace(/,00$/, "").replace(/\./g, "")) : NaN;
    if (!recipientName || recipientName.length > 191 || !category || !Number.isSafeInteger(amount) || amount < 1 || amount > 9000000000000) throw new Error(`Baris ${index}: isi nama (maks. 191 karakter), program Anak Yatim/Janda Dhuafa, dan nominal rupiah bulat positif (contoh 300000).`);
    const key = `${category}:${recipientName.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Baris ${index}: penerima dan program berulang.`);
    seen.add(key); rows.push({ recipientName, category, amount });
    if (rows.length > 200) throw new Error("Maksimal 200 penerima per file.");
  });
  if (!rows.length) throw new Error("Belum ada data. Isi mulai baris kedua.");
  return rows;
}
export async function downloadSantunanTemplate() {
  const { Workbook } = await import("exceljs");
  const book = new Workbook(), sheet = book.addWorksheet("Santunan");
  sheet.addRow(["Nama", "Program", "Nominal Bantuan"]);
  sheet.columns.forEach(column => { column.width = 30; });
  sheet.getRow(1).font = { bold: true };
  const url = URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"); link.href = url; link.download = "template-santunan.xlsx"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
