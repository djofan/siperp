export const statuses = {
  received: "Diterima", diagnosis: "Pengecekan", approval: "Menunggu persetujuan",
  repairing: "Dikerjakan", paused: "Ditunda", ready: "Siap diambil",
  collected: "Sudah diambil", cancelled: "Dibatalkan",
} as const;
export type TicketStatus = keyof typeof statuses;
export const priorities = { normal: "Normal", urgent: "Mendesak" } as const;
export const terminalStatuses = ["collected", "cancelled"];
type ScopeUser = { role: string; technician: { id: string; outletId: string } | null };
export function ticketScope(user: ScopeUser) { return user.role === "technician" ? { outletId: user.technician?.outletId ?? "__no_access__" } : {}; }
export function outletScope(user: ScopeUser) { return user.role === "technician" ? { id: user.technician?.outletId ?? "__no_access__" } : {}; }
const transitions: Record<TicketStatus, TicketStatus[]> = {
  received: ["diagnosis", "repairing", "cancelled"], diagnosis: ["approval", "repairing", "paused", "ready", "cancelled"],
  approval: ["repairing", "paused", "cancelled"], repairing: ["paused", "ready", "cancelled"],
  paused: ["diagnosis", "repairing", "approval", "ready", "cancelled"], ready: ["collected"], collected: [], cancelled: [],
};
export function isStatus(value: string): value is TicketStatus { return Object.hasOwn(statuses, value); }
export function canTransition(from: string, to: string) { return isStatus(from) && isStatus(to) && (from === to || transitions[from].includes(to)); }
export function nextStatuses(from: string) { return isStatus(from) ? transitions[from] : []; }
const fieldLabels: Record<string, string> = {
  name: "nama", address: "alamat", phone: "nomor telepon", userId: "akun teknisi", outletId: "outlet",
  specialty: "keahlian", technicianId: "teknisi", priority: "prioritas", dueAt: "target selesai",
  customerName: "nama pelanggan", customerPhone: "nomor telepon pelanggan", device: "perangkat",
  imei: "IMEI / nomor seri", complaint: "keluhan", accessories: "kondisi dan kelengkapan",
  ticketId: "tiket", status: "status", expectedStatus: "status sebelumnya", expectedVersion: "versi tiket",
  note: "catatan",
};
export function text(form: FormData, key: string, max = 191, required = true) {
  const value = String(form.get(key) ?? "").trim();
  if ((required && !value) || value.length > max) throw new Error(`Isian ${fieldLabels[key] ?? "formulir"} ${required ? "wajib diisi dan " : ""}maksimal ${max} karakter.`);
  return value;
}
export function integer(form: FormData, key: string, minimum = 0) {
  const raw = String(form.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isSafeInteger(value) || value < minimum || value > 1_000_000_000) throw new Error("Jumlah atau nominal tidak valid.");
  return value;
}
export function csvCell(value: unknown) {
  let string = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(string)) string = `'${string}`;
  return `"${string.replaceAll('"', '""')}"`;
}
