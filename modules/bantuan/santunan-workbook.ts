import type { CellValue } from "exceljs";

export type SantunanImportRow = { recipientName: string; category: "orphan" | "widow"; amount: number; verifierName: string };
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
  const sheets = book.worksheets.filter(sheet => sheet.actualRowCount > 0 && sheet.state !== "hidden" && sheet.state !== "veryHidden");
  if (sheets.length !== 1) throw new Error("Gunakan satu lembar data saja.");
  const sheet = sheets[0];
  if (sheet.rowCount > 10001 || sheet.columnCount > 100) throw new Error("Lembar terlalu besar. Gunakan template dengan maksimal 200 penerima.");
  const columns: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, index) => {
    const title = text(cell.value, 1).toLowerCase().replace(/\s+/g, " ");
    if (!["nama", "program", "nominal bantuan", "nama verifikator"].includes(title)) return;
    if (columns[title]) throw new Error(`Kolom ${title} berulang.`);
    columns[title] = index;
  });
  if (!["nama", "program", "nominal bantuan", "nama verifikator"].every(key => columns[key])) throw new Error("Baris pertama wajib berisi Nama, Program, Nominal Bantuan, Nama Verifikator.");
  const rows: SantunanImportRow[] = [], seen = new Set<string>();
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const recipientName = text(row.getCell(columns.nama).value, index);
    const program = text(row.getCell(columns.program).value, index).toLowerCase().replace(/\s+/g, " ").replace(/^santunan /, "");
    const raw = text(row.getCell(columns["nominal bantuan"]).value, index);
    const verifierName = text(row.getCell(columns["nama verifikator"]).value, index).replace(/\s+/g, " ");
    if (!recipientName && !program && !raw && !verifierName) return;
    const category = program === "anak yatim" ? "orphan" : program === "janda dhuafa" ? "widow" : null;
    const normalized = raw.replace(/^rp\.?\s*/i, "");
    const amount = /^\d+$/.test(normalized) ? Number(normalized) : /^\d{1,3}(\.\d{3})+(,00)?$/.test(normalized) ? Number(normalized.replace(/,00$/, "").replace(/\./g, "")) : NaN;
    if (!verifierName || verifierName.length > 191 || !recipientName || recipientName.length > 191 || !category || !Number.isSafeInteger(amount) || amount < 1 || amount > 9000000000000) throw new Error(`Baris ${index}: isi nama (maks. 191 karakter), program Anak Yatim/Janda Dhuafa, nama verifikator sesuai daftar, dan nominal rupiah bulat positif (contoh 300000).`);
    const key = `${category}:${recipientName.toLowerCase()}`;
    if (seen.has(key)) throw new Error(`Baris ${index}: penerima dan program berulang.`);
    seen.add(key); rows.push({ recipientName, category, amount, verifierName });
    if (rows.length > 200) throw new Error("Maksimal 200 penerima per file.");
  });
  if (!rows.length) throw new Error("Belum ada data. Isi mulai baris kedua.");
  return rows;
}
export function matchSantunanVerifiers(rows: SantunanImportRow[], people: { name: string }[]) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return rows.map((row, index) => {
    const matches = people.filter(person => normalize(person.name) === normalize(row.verifierName));
    if (matches.length !== 1) throw new Error(`Baris data ${index + 1}: verifikator “${row.verifierName}” ${matches.length ? "memiliki nama ganda. Hubungi admin untuk membedakan nama akun" : "tidak ada dalam daftar verifikator/penyalur aktif"}.`);
    return { ...row, verifierName: matches[0].name };
  });
}
export async function santunanWorkbook(names: string[], dummy = false) {
  const { Workbook } = await import("exceljs");
  const book = new Workbook(), sheet = book.addWorksheet("Santunan");
  sheet.addRow(["Nama", "Program", "Nominal Bantuan", "Nama Verifikator"]);
  sheet.columns = Array.from({ length: 4 }, () => ({ width: 30 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const uniqueNames = names.filter((name, index) => names.findIndex(item => item.trim().toLowerCase() === name.trim().toLowerCase()) === index && names.filter(item => item.trim().toLowerCase() === name.trim().toLowerCase()).length === 1);
  if (dummy) {
    if (!uniqueNames.length) throw new Error("Belum ada verifikator aktif dengan nama unik untuk data dummy.");
    for (let index = 0; index < 6; index++) sheet.addRow([`Penerima Dummy ${String(index + 1).padStart(2, "0")}`, index % 2 ? "Janda Dhuafa" : "Anak Yatim", index % 2 ? 250000 : 300000, uniqueNames[index % uniqueNames.length]]);
  }
  if (uniqueNames.length) {
    const reference = book.addWorksheet("Daftar Verifikator", { state: "hidden" });
    uniqueNames.forEach(name => reference.addRow([name]));
    for (let index = 2; index <= 201; index++) sheet.getCell(index, 4).dataValidation = { type: "list", allowBlank: false, formulae: [`'Daftar Verifikator'!$A$1:$A$${uniqueNames.length}`], showErrorMessage: true, errorTitle: "Nama tidak sesuai", error: "Pilih nama dari daftar verifikator." };
  }
  for (let index = 2; index <= 201; index++) sheet.getCell(index, 2).dataValidation = { type: "list", allowBlank: false, formulae: ['"Anak Yatim,Janda Dhuafa"'], showErrorMessage: true, error: "Pilih Anak Yatim atau Janda Dhuafa." };
  return book.xlsx.writeBuffer();
}
export async function downloadSantunanTemplate(names: string[], dummy = false) {
  const buffer = await santunanWorkbook(names, dummy);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"); link.href = url; link.download = dummy ? "dummy-santunan.xlsx" : "template-santunan.xlsx"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
