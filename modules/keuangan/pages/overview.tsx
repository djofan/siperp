import { formatNumericText } from "@/lib/number-format";
import Link from "next/link";
import { Wallet, FileText, Clock3, ArrowUpRight, ListChecks, Layers } from "lucide-react";
import { getKeuanganOverview } from "../api/overview";
import { getExpenses } from "../api/workflow";
import { Status, rupiah } from "../components/ui";
import { applicationDate } from "../components/ApplicationFields";
export const metadata={title:"Dashboard Keuangan | SIPERP",robots:{index:false,follow:false}};
export default async function KeuanganOverviewPage(){
  const [data, expenses] = await Promise.all([getKeuanganOverview(), getExpenses("", "1")]);
  const cards = [
    {label:"Pengajuan tercatat",value:data.counts.expenses,icon:FileText,note:"Seluruh pengajuan dan arsip",href:"/admin/keuangan/pengeluaran"},
    {label:"Approval menunggu Anda",value:data.counts.myPendingApprovals,icon:Clock3,note:"Perlu diperiksa dan diputuskan",href:"/admin/keuangan/approval"},
    {label:"Sumber dana",value:data.counts.sources,icon:Wallet,note:"Sumber dana yang tercatat",href:"/admin/keuangan/pengaturan"},
    {label:"Kategori",value:data.counts.categories,icon:Layers,note:"Kategori pengajuan yang tercatat",href:"/admin/keuangan/pengaturan"},
  ];
  return <>
    <section className="finance-welcome"><div><p className="finance-kicker">RUANG KERJA KEUANGAN</p><h1>Kelola pengajuan dengan lebih mudah.</h1><p>Pantau pengajuan dana, periksa persetujuan, dan temukan arsip keuangan Anda.</p></div>{data.permissions.writeExpenses&&!data.readOnly&&<Link className="finance-button" href="/admin/keuangan/pengeluaran/baru">Buat pengajuan <ArrowUpRight size={17}/></Link>}</section>
    <section aria-label="Ringkasan Keuangan" className="finance-stat-grid">{cards.filter(card=>card.value!==null).map(card=><Link className="finance-stat" href={card.href} key={card.label}><div><span>{card.label}</span><card.icon size={18}/></div><strong>{card.value?.toLocaleString("id-ID")}</strong><small>{card.note}</small></Link>)}</section>
    <div className="finance-dashboard-grid"><section className="finance-panel finance-recent"><div className="finance-section-title"><div><p className="finance-kicker">PENGAJUAN</p><h2>Pengajuan terbaru</h2></div><Link href="/admin/keuangan/pengeluaran">Lihat semua <ArrowUpRight size={16}/></Link></div>{expenses.items.length ? <div className="finance-table"><table><thead><tr><th>Pengajuan / Penerima</th><th>Nominal</th><th>Status</th></tr></thead><tbody>{expenses.items.slice(0,5).map(item=><tr key={item.id}><td><Link href={`/admin/keuangan/pengeluaran/${item.id}`}>{item.recipient || "Penerima belum dicantumkan"}</Link><small>{item.program || item.category}</small><small>{item.requestedOn ? applicationDate(item.requestedOn) : "Tanggal pengajuan tidak tersedia"}</small></td><td>{rupiah(item.amount)}</td><td><Status value={item.status}/></td></tr>)}</tbody></table></div>:<div className="finance-empty"><FileText size={28}/><h3>Belum ada pengajuan</h3><p>Pengajuan yang tercatat akan tampil di sini.</p></div>}</section>
    <div className="finance-dashboard-aside">{data.permissions.readApprovals&&<section className="finance-panel finance-review"><span className="finance-icon-tile"><ListChecks size={23}/></span><h2>Persetujuan Anda</h2><p>Periksa rincian penggunaan dana sebelum memberikan keputusan.</p><strong className="finance-pending-count">{formatNumericText(data.counts.myPendingApprovals ?? 0)}</strong><small>pengajuan menunggu Anda</small><Link className="finance-button" href="/admin/keuangan/approval">Buka Approval Saya <ArrowUpRight size={16}/></Link></section>}<section className="finance-panel"><h2>Alur pengajuan</h2><ol className="finance-flow"><li><span>1</span><div><strong>Ajukan dana</strong><p>Isi tujuan, program, nominal, dan Bendahara yang dituju.</p></div></li><li><span>2</span><div><strong>Pemeriksaan Bendahara</strong><p>Bendahara memeriksa dan memberikan keputusan.</p></div></li><li><span>3</span><div><strong>Simpan dokumen</strong><p>Buka detail untuk melihat riwayat dan mencetak pengajuan.</p></div></li></ol></section></div></div>
    <p className="finance-footnote">Persetujuan merupakan keputusan internal. Status disetujui tidak menandakan pembayaran atau perubahan saldo.</p>
  </>;
}
