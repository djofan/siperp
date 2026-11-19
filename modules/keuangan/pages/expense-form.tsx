import { RupiahInput } from "../components/RupiahInput";
import { treasuryLabel } from "../components/ApplicationFields";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { getExpense, getExpenseOptions } from "../api/workflow";
import { getKeuanganOverview } from "../api/overview";
import { FinanceForm } from "../components/FinanceForm";
export async function ExpenseEditor({ id }: { id?: string }) {
  const overview = await getKeuanganOverview();
  if (!overview.permissions.writeExpenses || overview.readOnly) return <p>Akun ini tidak dapat membuat pengajuan saat ini.</p>;
  const [options, expense] = await Promise.all([getExpenseOptions(), id ? getExpense(id) : Promise.resolve(null)]);
  const ready = options.sources.length > 0 && options.categories.length > 0 && options.programs.length > 0 && options.treasurers.length > 0;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <><Link href={id ? `/admin/keuangan/pengeluaran/${id}` : "/admin/keuangan/pengeluaran"}>← Kembali</Link>
    <h2>{id ? "Revisi pengajuan keuangan" : "Buat pengajuan keuangan"}</h2>
    {!ready ? <section className="finance-warning"><p>Lengkapi jenis program dan pastikan ada akun Bendahara SIP aktif sebelum membuat pengajuan.</p>{overview.permissions.writeMasters && <Link href="/admin/keuangan/pengaturan">Kelola jenis program</Link>}</section> : <FinanceForm kind="expense" id={id ?? null} requestId={randomUUID()} label={id ? "Simpan revisi & ajukan kembali" : "Ajukan kepada Bendahara SIP"}>
      {expense && <input type="hidden" name="version" value={expense.version} />}
      <div className="finance-grid">
        <label>Kategori pengajuan<select name="categoryId" required defaultValue={options.categories.some(o => o.id === expense?.categoryId) ? expense?.categoryId : ""}><option value="" disabled>Pilih kategori</option>{options.categories.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label>Sumber dana<select name="sourceId" required defaultValue={options.sources.some(o => o.id === expense?.sourceId) ? expense?.sourceId : ""}><option value="" disabled>Pilih sumber dana</option>{options.sources.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      </div>
      <label>Jenis program<select name="programId" required defaultValue={expense?.programId ?? ""}><option value="" disabled>Pilih jenis program</option>{options.programs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label>Deskripsi pengajuan<textarea name="description" required maxLength={10000} rows={4} defaultValue={expense?.description} placeholder="Jelaskan penggunaan dana dan tujuannya secara singkat, jelas, dan padat." /></label>
      <RupiahInput defaultValue={expense?.amount ?? ""} />
      <label>Nama penerima pembayaran (opsional)<input name="recipient" defaultValue={expense?.recipient} maxLength={255} /></label>
      <label>Identitas penerima pembayaran (opsional)<textarea name="recipientIdentity" defaultValue={expense?.recipientIdentity ?? ""} maxLength={2000} rows={3} placeholder="Identitas orang/lembaga, alamat, atau informasi rekening sesuai kebutuhan." /></label>
      <div className="finance-grid"><label>Tanggal pengajuan<input type="date" name="requestedOn" required defaultValue={expense?.requestedOn ?? today} min="1000-01-01" max="9999-12-31" /></label>
        <label>Pihak yang menyetujui<select name="treasurerId" required defaultValue={options.treasurers.some(o => o.id === expense?.treasurerId) ? expense?.treasurerId ?? "" : options.treasurers.length === 1 ? options.treasurers[0].id : ""}><option value="" disabled>Pilih Bendahara SIP</option>{options.treasurers.map(o => <option key={o.id} value={o.id}>{treasuryLabel(o.name)}</option>)}</select></label></div>
      <p>Pengajuan hanya dapat disetujui oleh Bendahara SIP. Admin Keuangan tidak dapat menyetujui pengajuannya sendiri.</p>
      {id && <><label>Alasan revisi<textarea name="reason" required minLength={10} maxLength={2000} rows={3} /></label><p>Revisi menutup penugasan sebelumnya dan meminta persetujuan baru. Riwayat tetap tersimpan.</p></>}
    </FinanceForm>}
  </>;
}
export default async function NewExpensePage() { return <ExpenseEditor />; }
