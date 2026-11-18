import Link from "next/link";
import { getKeuanganOverview } from "../api/overview";
import styles from "../styles/workspace.module.css";
export const metadata={title:"Keuangan | SIPERP",robots:{index:false,follow:false}};
export default async function KeuanganOverviewPage(){
  const data=await getKeuanganOverview();
  const cards=[["Pengeluaran tercatat",data.counts.expenses],["Approval menunggu Anda",data.counts.myPendingApprovals],["Sumber dana",data.counts.sources],["Kategori",data.counts.categories]] as const;
  return <><h2>Ringkasan Keuangan</h2><p>Pencatatan pengeluaran dan persetujuan internal. Data web Keuangan lama belum diimpor.</p><section className={styles.cards}>{cards.filter(([,value])=>value!==null).map(([label,value])=><article key={label}><h2>{label}</h2><strong>{value}</strong></article>)}</section><section className="finance-panel"><h2>Mulai bekerja</h2><ol><li>Pengelola menyiapkan sumber dana, kategori, dan rentang aturan approver.</li><li>Admin Operasional/Admin Keuangan mencatat pengeluaran.</li><li>Approver memberikan keputusan pada Approval Saya.</li></ol><div className="finance-actions"><Link href="/admin/keuangan/pengeluaran">Buka pengeluaran →</Link>{data.permissions.writeExpenses&&!data.readOnly&&<Link href="/admin/keuangan/pengeluaran/baru">Catat pengeluaran</Link>}</div></section><p className={styles.notice}>Disetujui berarti persetujuan internal, bukan pembayaran. Tidak ada pemindahan uang, perubahan saldo bank, atau posting ke Keuangan Core.</p></>;
}
