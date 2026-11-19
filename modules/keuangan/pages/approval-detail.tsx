import { ApplicationFields } from "../components/ApplicationFields";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { CheckCheck, ArrowLeft, ShieldCheck } from "lucide-react";
import { getApproval } from "../api/workflow";
import { getKeuanganOverview } from "../api/overview";
import { FinanceForm } from "../components/FinanceForm";
import { Status, rupiah, FinanceHistoryPanel } from "../components/ui";
export default async function ApprovalDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}) {
  const {id}=await params;
  const [a,overview,q]=await Promise.all([getApproval(id),getKeuanganOverview(),searchParams]);
  const current=a.revision===a.expense.revision;
  const editable=a.canDecide&&!overview.readOnly;
  const treasury=overview.role==="treasurer";
  return <>
    <Link className="finance-back-link" href="/admin/keuangan/approval"><ArrowLeft size={16}/> Kembali ke Approval Saya</Link>
    <div className="finance-title"><div><p className="finance-kicker">PERSETUJUAN PENGAJUAN</p><h1>{a.decision==="waiting"?"Periksa pengajuan dana":"Keputusan pengajuan"}</h1><p>Periksa rincian pengajuan sebelum menyimpan keputusan Anda.</p></div><Status value={a.decision}/></div>
    {q.saved&&<p role="status" className="finance-success">Keputusan berhasil disimpan.</p>}
    <div className="finance-approval-layout"><section className="finance-panel finance-approval-summary"><div className="finance-amount-summary"><span className="finance-icon-tile"><ShieldCheck size={24}/></span><div><small>Nominal pengajuan</small><strong>{rupiah(a.expense.amount)}</strong></div></div>
      <h2>Rincian pengajuan</h2><ApplicationFields expense={a.expense}/><div className="finance-description-box"><h3>Deskripsi pengajuan</h3><p className="finance-text">{a.expense.description || "Tidak tercatat"}</p></div>
      {!current&&<p className="finance-warning">Pengajuan sudah diperbarui. Tugas ini berasal dari revisi sebelumnya dan tidak dapat diputuskan.</p>}
      {!treasury&&<div className="finance-actions"><Link href={`/admin/keuangan/pengeluaran/${a.expense.id}`}>Lihat pengajuan &amp; riwayat</Link><Link className="finance-button-secondary" href={`/admin/keuangan/pengeluaran/${a.expense.id}/cetak`}>Cetak pengajuan</Link></div>}
    </section>
    <section className="finance-decision-panel"><div className="finance-decision-heading"><span className="finance-icon-tile"><CheckCheck size={24}/></span><div><p className="finance-kicker">TINDAK LANJUT</p><h2>{a.decision==="waiting"?"Berikan keputusan":"Revisi keputusan"}</h2></div></div>
      {!editable?<div className="finance-panel"><p>Keputusan tidak dapat diubah pada tugas ini. Penugasan sudah ditutup, ada penolakan lain, berasal dari revisi sebelumnya, atau modul sedang nonaktif.</p></div>:<FinanceForm kind="decision" id={id} requestId={randomUUID()} label={a.decision==="waiting"?"Simpan keputusan":"Simpan revisi keputusan"}>
        <input type="hidden" name="version" value={a.version}/><label>Keputusan Anda<select name="decision" defaultValue={a.decision==="waiting"?"":a.decision} required><option value="" disabled>Pilih keputusan</option><option value="approved">Setujui pengajuan</option><option value="rejected">Tolak pengajuan</option></select></label>
        <label>Catatan<textarea name="note" defaultValue={a.note??""} rows={4} maxLength={2000} placeholder="Tuliskan alasan atau catatan untuk Admin Keuangan"/><small>Jika menolak, isi alasan minimal 10 karakter.</small></label>
        {a.decision!=="waiting"&&<label>Alasan revisi keputusan<textarea name="reason" minLength={10} maxLength={2000} rows={3} required placeholder="Jelaskan alasan perubahan keputusan"/></label>}
        <p className="finance-decision-note">Keputusan dan perubahannya tersimpan dalam riwayat. Persetujuan ini bukan bukti pembayaran.</p>
      </FinanceForm>}
    </section></div>
    {!treasury&&<FinanceHistoryPanel items={a.history}/>}
  </>;
}
