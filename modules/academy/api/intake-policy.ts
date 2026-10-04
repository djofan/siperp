import { normalizePhone } from "./policy";
export type IntakeRow = { name: string; email: string; phone: string; gender: "IKHWAN" | "AKHWAT" };
export function parseParticipantsCsv(value: string): IntakeRow[] {
  if (value.length > 100000) throw new Error("CSV maksimal 100 KB.");
  const rows: string[][] = [], row: string[] = [];
  let field = "", quoted = false;
  value = value.replace(/^\uFEFF/, "");
  for (let index = 0; index <= value.length; index++) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') { field += '"'; index++; }
      else if (!quoted && field) throw new Error("Format CSV tidak valid.");
      else quoted = !quoted;
    } else if ((!quoted && (character === "," || character === "\n" || character === undefined))) {
      row.push(field.replace(/\r$/, "").trim()); field = "";
      if (character !== ",") { if (row.some(cell => cell)) rows.push([...row]); row.length = 0; }
    } else if (character !== undefined) field += character;
  }
  if (quoted) throw new Error("Tanda kutip CSV belum ditutup.");
  const headers = rows.shift()?.map(cell => cell.toLowerCase()) ?? [];
  if (!["name", "email", "phone", "gender"].every(key => headers.includes(key))) throw new Error("Kolom CSV wajib: name,email,phone,gender.");
  if (!rows.length || rows.length > 50) throw new Error("Impor 1–50 peserta per batch.");
  const result: IntakeRow[] = rows.map((row, index) => {
    const get = (key: string) => row[headers.indexOf(key)] ?? "";
    const name = get("name"), email = get("email").toLowerCase(), phone = normalizePhone(get("phone")), gender = get("gender").toUpperCase();
    if (name.length < 2 || name.length > 100 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || (gender !== "IKHWAN" && gender !== "AKHWAT")) throw new Error(`Data baris ${index + 2} tidak valid.`);
    return { name, email, phone, gender };
  });
  if (new Set(result.map(row => row.email)).size !== result.length || new Set(result.map(row => row.phone)).size !== result.length) throw new Error("Email atau nomor WhatsApp dalam CSV berulang.");
  return result;
}
export function contactVcard(name: string, phone: string, email: string) {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/[\r\n]/g, " ").replace(/[,;]/g, character => "\\" + character);
  return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${escape(name)}\r\nTEL;TYPE=CELL:+${phone}\r\nEMAIL:${escape(email)}\r\nEND:VCARD\r\n`;
}
