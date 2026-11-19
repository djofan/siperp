import Link from "next/link";
import { getKeuanganOverview } from "../api/overview";
import styles from "../styles/workspace.module.css";
export const metadata={title:"Keuangan | SIPERP",robots:{index:false,follow:false}};
export default async function KeuanganOverviewPage(){
  const data=await getKeuanganOverview();
  const cards=[["Pengajuan tercatat",data.counts.expenses],["Approval menunggu Anda",data.counts.myPendingApprovals],["Sumber dana",data.counts.sources],["Kategori",data.counts.categories]] as const;
  return <><h2>Ringkasan Keuangan</h2><p>Pengajuan dana dan persetujuan Bendahara SIP, beserta arsip keuangan yang sudah tercatat.</p><section className={styles.cards}>{cards.filter(([,value])=>value!==null).map(([label,value])=><article key={label}><h2>{label}</h2><strong>{value}</strong></article>)}</section><section className="finance-panel"><h2>Mulai bekerja</h2><ol><li>Pengelola melengkapi jenis program dan akun Bendahara SIP.</li><li>Admin Keuangan mengisi pengajuan dan memilih Bendahara SIP yang dituju.</li><li>Bendahara SIP memeriksa dan memberi keputusan melalui Approval Saya.</li></ol><div className="finance-actions"><Link href="/admin/keuangan/pengeluaran">Buka pengajuan →</Link>{data.permissions.writeExpenses&&!data.readOnly&&<Link href="/admin/keuangan/pengeluaran/baru">Buat pengajuan</Link>}</div></section><p className={styles.notice}>Disetujui berarti persetujuan internal, bukan pembayaran. Tidak ada pemindahan uang, perubahan saldo bank, atau posting ke Keuangan Core.</p></>;
}
