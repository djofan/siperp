import { randomUUID } from "node:crypto";
import Link from "next/link";
import { getExpense, getExpenseOptions } from "../api/workflow";
import { getKeuanganOverview } from "../api/overview";
import { FinanceForm } from "../components/FinanceForm";
export async function ExpenseEditor({id}:{id?:string}) {
  const overview=await getKeuanganOverview();
  if(!overview.permissions.writeExpenses||overview.readOnly)return <p>Akun ini tidak dapat menulis pengeluaran saat ini.</p>;
  const [options,expense]=await Promise.all([getExpenseOptions(),id?getExpense(id):Promise.resolve(null)]);
  const ready=options.sources.length>0&&options.categories.length>0;
  return <><Link href={id?`/admin/keuangan/pengeluaran/${id}`:"/admin/keuangan/pengeluaran"}>← Kembali</Link><h2>{id?"Revisi pengeluaran":"Tambah pengeluaran"}</h2>{!ready?<p>Pengelola perlu menambahkan sumber dana dan kategori melalui menu pengaturan terlebih dahulu.</p>:<FinanceForm kind="expense" id={id??null} requestId={randomUUID()} label={id?"Simpan revisi & minta approval ulang":"Simpan pengeluaran"}>{expense&&<input type="hidden" name="version" value={expense.version}/>}<label>Penerima<input name="recipient" defaultValue={expense?.recipient} required maxLength={255}/></label><div className="finance-grid"><label>Sumber dana<select name="sourceId" required defaultValue={expense?.sourceId??""}><option value="" disabled>Pilih sumber</option>{options.sources.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>Kategori<select name="categoryId" required defaultValue={expense?.categoryId??""}><option value="" disabled>Pilih kategori</option>{options.categories.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label></div><label>Nominal (rupiah, tanpa titik/koma)<input type="text" inputMode="numeric" pattern="[1-9][0-9]*" name="amount" required defaultValue={expense?.amount} maxLength={16}/></label><label>Deskripsi<textarea name="description" required maxLength={10000} rows={4} defaultValue={expense?.description}/></label>{id&&<label>Alasan revisi<textarea name="reason" required minLength={10} maxLength={2000} rows={3}/></label>}<p>Approval dipilih otomatis dari rentang nominal. Jika tidak ada aturan yang cocok, pengeluaran tercatat sebagai Tanpa penugasan dan belum disetujui.</p>{id&&<p>Semua penugasan revisi sebelumnya ditutup. Revisi ini memulai approval baru sesuai aturan saat disimpan. Riwayat lama tetap tersimpan.</p>}</FinanceForm>}</>;
}
export default async function NewExpensePage(){return <ExpenseEditor/>;}
