import Link from "next/link";
import { getExpenses } from "../api/workflow";
import { getKeuanganOverview } from "../api/overview";
import { Status, rupiah, date, FinancePagination } from "../components/ui";
export default async function ExpensesPage({searchParams}:{searchParams:Promise<{search?:string;page?:string}>}) {
  const q=await searchParams;const search=String(q.search??"").slice(0,100);const page=String(q.page??"1");
  const [data,overview]=await Promise.all([getExpenses(search,page),getKeuanganOverview()]);
  return <><div className="finance-title"><h2>Pengeluaran</h2>{overview.permissions.writeExpenses&&!overview.readOnly&&<Link className="finance-button" href="/admin/keuangan/pengeluaran/baru">Tambah pengeluaran</Link>}</div><form className="finance-search"><label>Cari penerima atau deskripsi<input name="search" defaultValue={search} maxLength={100}/></label><button>Cari</button></form><div className="finance-table"><table><thead><tr>{["Tanggal","Penerima","Sumber / Kategori","Nominal","Approval","Aksi"].map(v=><th key={v}>{v}</th>)}</tr></thead><tbody>{data.items.map(e=><tr key={e.id}><td>{date(e.createdAt)}</td><td>{e.recipient}<small>Revisi {e.revision}</small></td><td>{e.source}<small>{e.category}</small></td><td>{rupiah(e.amount)}</td><td><Status value={e.status}/></td><td><Link href={`/admin/keuangan/pengeluaran/${e.id}`}>Detail →</Link></td></tr>)}{!data.items.length&&<tr><td colSpan={6}>Belum ada pengeluaran yang cocok.</td></tr>}</tbody></table></div><FinancePagination {...data} base="/admin/keuangan/pengeluaran" search={search}/></>;
}
