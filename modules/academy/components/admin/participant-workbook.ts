import type { CellValue, Workbook } from "exceljs";
import type { ParticipantImportCredential, ParticipantImportRow } from "../../api/participant-import-contracts";

export const MAX_IMPORT_ROWS = 200;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function text(value: CellValue, row: number): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value === "object" && "richText" in value) return value.richText.map(item => item.text).join("").trim();
  throw new Error(`Baris ${row}: gunakan teks atau angka biasa, tanpa rumus, tanggal, atau tautan.`);
}

export async function readParticipantWorkbook(buffer: ArrayBuffer): Promise<ParticipantImportRow[]> {
  const ExcelJS = await import("exceljs");
  const book = new ExcelJS.Workbook();
  try { await book.xlsx.load(buffer); }
  catch { throw new Error("File Excel tidak dapat dibaca. Gunakan file .xlsx sesuai template, tanpa proteksi password."); }
  const sheets = book.worksheets.filter(sheet => sheet.actualRowCount > 0);
  if (sheets.length !== 1) throw new Error("Gunakan satu lembar berisi data peserta. Hapus lembar lain yang terisi.");
  const sheet = sheets[0];
  if (sheet.rowCount > 10001 || sheet.columnCount > 100) throw new Error("Lembar terlalu besar. Salin data ke template dan batasi 200 peserta per file.");
  const aliases: Record<string, keyof Omit<ParticipantImportRow, "rowNumber">> = {
    nama: "name", namalengkap: "name", name: "name",
    nohp: "phone", nomorhp: "phone", nohandphone: "phone", nomorhandphone: "phone", phone: "phone", hp: "phone", nowhatsapp: "phone", nomorwa: "phone",
    alamat: "address", alamatlengkap: "address", address: "address",
  };
  const columns: Partial<Record<"name" | "phone" | "address", number>> = {};
  sheet.getRow(1).eachCell((cell, index) => {
    const key = aliases[text(cell.value, 1).toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (!key) return;
    if (columns[key]) throw new Error("Judul kolom berulang. Gunakan satu kolom Nama, No HP, dan Alamat.");
    columns[key] = index;
  });
  if (!columns.name || !columns.phone || !columns.address) throw new Error("Baris pertama wajib berisi judul kolom Nama, No HP, dan Alamat.");
  const { name, phone, address } = columns as Record<"name" | "phone" | "address", number>;
  const rows: ParticipantImportRow[] = [];
  sheet.eachRow((row, number) => {
    if (number === 1) return;
    const values = { rowNumber: number, name: text(row.getCell(name).value, number), phone: text(row.getCell(phone).value, number), address: text(row.getCell(address).value, number) };
    if (!values.name && !values.phone && !values.address) return;
    if (!values.name || !values.phone || !values.address) throw new Error(`Baris ${number}: Nama, No HP, dan Alamat wajib diisi.`);
    if (values.name.length > 100 || values.address.length > 2000 || values.phone.length > 40) throw new Error(`Baris ${number}: nama maksimal 100, alamat 2.000, dan nomor HP 40 karakter.`);
    rows.push(values);
    if (rows.length > MAX_IMPORT_ROWS) throw new Error("Maksimal 200 peserta per file. Pisahkan data menjadi beberapa file.");
  });
  if (!rows.length) throw new Error("File belum berisi data peserta. Isi data mulai baris kedua.");
  return rows;
}

function style(book: Workbook, title: string, headers: string[], widths: number[]) {
  const sheet = book.addWorksheet(title, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = widths.map(width => ({ width }));
  sheet.addRow(headers);
  sheet.getRow(1).height = 28;
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFD1F843" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005840" } };
    cell.alignment = { vertical: "middle" };
  });
  return sheet;
}

export async function participantTemplate() {
  const ExcelJS = await import("exceljs");
  const book = new ExcelJS.Workbook();
  const sheet = style(book, "Peserta", ["Nama", "No HP", "Alamat"], [32, 24, 65]);
  sheet.getColumn(2).numFmt = "@";
  return book.xlsx.writeBuffer();
}

export async function participantAccountsWorkbook(credentials: ParticipantImportCredential[]) {
  const ExcelJS = await import("exceljs");
  const book = new ExcelJS.Workbook();
  const sheet = style(book, "Akun peserta", ["Nama", "No HP", "NIP", "Password awal"], [32, 24, 18, 28]);
  sheet.getColumn(2).numFmt = "@";
  for (const account of credentials) sheet.addRow([account.name, account.phone, account.code, account.password]);
  return book.xlsx.writeBuffer();
}

export function downloadWorkbook(buffer: ArrayBuffer, filename: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
