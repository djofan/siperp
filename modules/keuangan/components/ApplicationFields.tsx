import type { FinanceExpense } from "@/contracts/modules/keuangan";
export function treasuryLabel(name: string) { return /^bendahara(?: sip)?$/i.test(name.trim()) ? "Bendahara SIP" : `Bendahara SIP · ${name}`; }
export function applicationDate(value: string | null) {
  if (!value) return "Belum tercatat (data lama)";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00+07:00`));
}
export function ApplicationFields({ expense: e }: { expense: FinanceExpense }) {
  return <dl className="finance-grid"><div><dt>Tanggal pengajuan</dt><dd>{applicationDate(e.requestedOn)}</dd></div><div><dt>Pengaju</dt><dd>{e.createdBy ?? "Tidak tercatat (data lama)"}</dd></div><div><dt>Kategori pengajuan</dt><dd>{e.category}</dd></div><div><dt>Sumber dana</dt><dd>{e.source}</dd></div><div><dt>Jenis program</dt><dd>{e.program ?? "Belum tercatat"}</dd></div><div><dt>Penerima pembayaran</dt><dd>{e.recipient || "Belum dicantumkan"}</dd></div><div><dt>Identitas penerima pembayaran</dt><dd className="finance-text">{e.recipientIdentity || "Belum dicantumkan"}</dd></div><div><dt>Pihak yang menyetujui</dt><dd>{e.treasurer ? treasuryLabel(e.treasurer) : "Lihat penugasan/arsip persetujuan"}</dd></div></dl>;
}
