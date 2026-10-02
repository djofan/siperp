export function normalizePhone(value: string | null | undefined) {
  let phone = (value ?? "").replace(/[\s()+.-]/g, "");
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  else if (phone.startsWith("8")) phone = "62" + phone;
  return /^\d{8,15}$/.test(phone) ? phone : null;
}
export function normalizeEmail(value: string | null | undefined) {
  const email = (value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 191 ? email : null;
}
export function positiveRupiah(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) throw new Error("Nominal harus bilangan bulat rupiah tanpa pemisah.");
  const amount = Number(text);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 2147483647) throw new Error("Nominal harus 1–2.147.483.647 rupiah.");
  return amount;
}
export function bankDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Tanggal harus YYYY-MM-DD.");
  const date = new Date(value + "T00:00:00+07:00");
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 7 * 3600000).toISOString().slice(0,10) !== value) throw new Error("Tanggal tidak valid.");
  return date;
}
// RFC4180 fields, including quoted commas and escaped quotes. A single header is required.
export function parseBankCsv(csv: string) {
  if (csv.length > 1024 * 1024) throw new Error("CSV maksimal 1 MB.");
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) { if (c === '"') { if (csv[i+1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += c; }
    else if (c === '"' && !field && !closed) quoted = true;
    else if (c === ",") { row.push(field); field = ""; closed = false; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && csv[i+1] === "\n") i++; row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ""; closed = false; }
    else { if (closed || c === '"') throw new Error("Tanda kutip CSV tidak valid."); field += c; }
  }
  if (quoted) throw new Error("Tanda kutip CSV belum ditutup.");
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  const header = rows.shift()?.map(v => v.replace(/^\uFEFF/, "").trim().toLowerCase());
  if (header?.join(",") !== "tanggal,referensi,keterangan,arah,nominal") throw new Error("Header CSV: tanggal,referensi,keterangan,arah,nominal.");
  if (!rows.length || rows.length > 1000) throw new Error("Impor harus berisi 1–1000 baris.");
  return rows.map((r, i) => {
    if (r.length !== 5 || !r[1].trim() || r[1].length > 191 || r[2].length > 2000 || !["masuk", "keluar"].includes(r[3].trim().toLowerCase())) throw new Error(`Baris ${i+2} tidak valid.`);
    return { bookedAt: bankDate(r[0].trim()), reference: r[1].trim(), description: r[2].trim(), direction: r[3].trim().toLowerCase(), amount: positiveRupiah(r[4]) };
  });
}
export function canMatchBank(line: { accountId: string; amount: number; direction: string }, entry: { accountId: string; amount: number; direction: string }) {
  return line.accountId === entry.accountId && line.amount === entry.amount && line.direction === entry.direction;
}
