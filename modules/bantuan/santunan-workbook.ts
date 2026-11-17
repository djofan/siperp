import type { CellValue } from "exceljs";

import type { SantunanCategory } from "@/contracts/modules/bantuan";
export type SantunanImportRow = { recipientName: string; category: SantunanCategory; frequency?: "routine" | "non_routine"; amount: number; verifierName: string; verifierId?: string };
const programs: Record<string, SantunanCategory> = { "anak yatim": "orphan", "yatim": "orphan", "anak yatim tidak rutin": "orphan", "yatim tidak rutin": "orphan", "janda dhuafa": "widow", "anak asuh": "foster_child", "lembaga tahfidz": "tahfidz", "pendidikan": "education", "umum": "general" };
const programOptions = ["Anak Yatim", "Anak Yatim Tidak Rutin", "Janda Dhuafa", "Anak Asuh", "Lembaga Tahfidz", "Pendidikan", "Umum"];
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id");

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
    if (!["nama", "program", "nominal bantuan", "nama verifikator", "jenis santunan"].includes(title)) return;
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
    const category = Object.hasOwn(programs, program) ? programs[program] : undefined;
    const kind = columns["jenis santunan"] ? normalize(text(row.getCell(columns["jenis santunan"]).value, index)) : "";
    if (kind && !["rutin", "tidak rutin", "routine", "non_routine"].includes(kind)) throw new Error(`Baris ${index}: jenis santunan harus Rutin atau Tidak rutin.`);
    const frequency = program.endsWith("tidak rutin") || ["tidak rutin", "non_routine"].includes(kind) ? "non_routine" : "routine";
    if (category && frequency === "non_routine" && ["widow", "foster_child"].includes(category)) throw new Error(`Baris ${index}: program ini hanya mendukung santunan rutin.`);
    const normalized = raw.replace(/^rp\.?\s*/i, "");
    const amount = /^\d+$/.test(normalized) ? Number(normalized) : /^\d{1,3}(\.\d{3})+(,00)?$/.test(normalized) ? Number(normalized.replace(/,00$/, "").replace(/\./g, "")) : NaN;
    if (!verifierName || verifierName.length > 191 || !recipientName || recipientName.length > 191 || !category || !Number.isSafeInteger(amount) || amount < 1 || amount > 9000000000000) throw new Error(`Baris ${index}: isi nama (maks. 191 karakter), program dari template, nama verifikator, dan nominal rupiah bulat positif (contoh 300000).`);
    const key = `${frequency}:${category}:${normalize(recipientName)}`;
    if (seen.has(key)) throw new Error(`Baris ${index}: penerima dan program berulang.`);
    seen.add(key); rows.push({ recipientName, category, frequency, amount, verifierName });
    if (rows.length > 200) throw new Error("Maksimal 200 penerima per file.");
  });
  if (!rows.length) throw new Error("Belum ada data. Isi mulai baris kedua.");
  return rows;
}
export function matchSantunanVerifiers(rows: SantunanImportRow[], people: { id?: string; name: string }[]) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return rows.map((row, index) => {
    const matches = people.filter(person => row.verifierId ? person.id === row.verifierId : normalize(person.name) === normalize(row.verifierName));
    if (matches.length !== 1) throw new Error(`Baris data ${index + 1}: verifikator “${row.verifierName}” ${matches.length ? "memiliki nama ganda. Hubungi admin untuk membedakan nama akun" : "tidak ada dalam daftar verifikator/penyalur aktif"}.`);
    return { ...row, ...(matches[0].id ? { verifierId: matches[0].id } : {}), verifierName: row.verifierId ? row.verifierName : matches[0].name };
  });
}
// Suggestions require an explicit selection; fuzzy names never become assignments automatically.
export function suggestSantunanVerifiers<T extends { name: string }>(name: string, people: T[]): T[] {
  const comparable = (value: string) => normalize(value).normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(word => word && !["pak", "bapak", "bang", "bg", "ustadz", "ust", "haji"].includes(word)).join(" ");
  const distance = (left: string, right: string) => {
    let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let i = 1; i <= left.length; i++) {
      const current = [i];
      for (let j = 1; j <= right.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = current;
    }
    return previous[right.length];
  };
  const value = comparable(name);
  if (!value) return [];
  return people.map(person => {
    const target = comparable(person.name), words = value.split(" "), other = target.split(" ");
    const shared = words.filter(word => other.includes(word)).length;
    const score = Math.max(1 - distance(value, target) / Math.max(value.length, target.length, 1), shared ? shared / Math.max(words.length, other.length) : 0);
    return { person, score };
  }).filter(item => item.score >= .45).sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name, "id")).slice(0, 3).map(item => item.person);
}
export async function santunanWorkbook(names: string[], dummy = false) {
  const { Workbook } = await import("exceljs");
  const book = new Workbook(), sheet = book.addWorksheet("Santunan");
  sheet.addRow(["Nama", "Program", "Nominal Bantuan", "Nama Verifikator", "Jenis Santunan"]);
  sheet.columns = Array.from({ length: 5 }, () => ({ width: 30 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const uniqueNames = names.filter((name, index) => names.findIndex(item => item.trim().toLowerCase() === name.trim().toLowerCase()) === index && names.filter(item => item.trim().toLowerCase() === name.trim().toLowerCase()).length === 1);
  if (dummy) {
    if (!uniqueNames.length) throw new Error("Belum ada verifikator aktif dengan nama unik untuk data dummy.");
    for (let index = 0; index < 6; index++) sheet.addRow([`Penerima Dummy ${String(index + 1).padStart(2, "0")}`, programOptions[index % programOptions.length], index % 2 ? 250000 : 300000, uniqueNames[index % uniqueNames.length], index === 1 ? "Tidak rutin" : "Rutin"]);
  }
  if (uniqueNames.length) {
    const reference = book.addWorksheet("Daftar Verifikator", { state: "hidden" });
    uniqueNames.forEach(name => reference.addRow([name]));
    for (let index = 2; index <= 201; index++) sheet.getCell(index, 4).dataValidation = { type: "list", allowBlank: false, formulae: [`'Daftar Verifikator'!$A$1:$A$${uniqueNames.length}`], showErrorMessage: true, errorTitle: "Nama tidak sesuai", error: "Pilih nama dari daftar verifikator." };
  }
  for (let index = 2; index <= 201; index++) sheet.getCell(index, 2).dataValidation = { type: "list", allowBlank: false, formulae: [`"${programOptions.join(",")}"`], showErrorMessage: true, error: "Pilih program dari daftar." };
  for (let index = 2; index <= 201; index++) sheet.getCell(index, 5).dataValidation = { type: "list", allowBlank: true, formulae: ['"Rutin,Tidak rutin"'] };
  return book.xlsx.writeBuffer();
}
export async function downloadSantunanTemplate(names: string[], dummy = false) {
  const buffer = await santunanWorkbook(names, dummy);
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"); link.href = url; link.download = dummy ? "dummy-santunan.xlsx" : "template-santunan.xlsx"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
