import Link from "next/link";
import { getApprovals } from "../api/workflow";
import { Status, rupiah, FinancePagination } from "../components/ui";
export default async function ApprovalsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const q=await searchParams;const data=await getApprovals(String(q.page??"1"));
  return <><h2>Approval Saya</h2><p>Hanya penugasan milik akun Anda. Tugas menunggu ditampilkan lebih dahulu.</p><div className="finance-table"><table><thead><tr><th>Penerima</th><th>Nominal</th><th>Revisi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{data.items.map(a=><tr key={a.id}><td>{a.expense.recipient}</td><td>{rupiah(a.expense.amount)}</td><td>{a.revision}</td><td><Status value={a.decision}/>{a.closed&&<small>Penugasan ditutup</small>}</td><td><Link className={a.canDecide&&a.decision==="waiting"?"finance-button finance-review-action":"finance-detail-link"} href={`/admin/keuangan/approval/${a.id}`}>{a.canDecide&&a.decision==="waiting"?"Periksa & beri persetujuan →":"Lihat keputusan →"}</Link></td></tr>)}{!data.items.length&&<tr><td colSpan={5}>Belum ada penugasan approval.</td></tr>}</tbody></table></div><FinancePagination {...data} base="/admin/keuangan/approval"/></>;
}
