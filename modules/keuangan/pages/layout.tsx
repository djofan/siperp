import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getKeuanganOverview } from "../api/overview";
import styles from "../styles/workspace.module.css";
import "../styles/workflow.css";
export const metadata={title:"Keuangan | SIPERP",robots:{index:false,follow:false}};
export default async function FinanceLayout({children}:{children:React.ReactNode}) {
  if(!await getSession())redirect("/admin/login");
  let data;
  try{data=await getKeuanganOverview();}catch(error){if(!(error instanceof ApiError)||![401,403,404].includes(error.status))throw error;return <main className={styles.workspace}><Link href="/admin">← Dashboard SIPERP</Link><h1>Keuangan</h1><p>Modul belum aktif atau akun tidak memiliki akses Keuangan. Hubungi pengelola.</p></main>;}
  return <main className={`${styles.workspace} finance-workspace`}><Link href="/admin">← Dashboard SIPERP</Link><header><div><p className={styles.eyebrow}>Ruang kerja SIPERP</p><h1>Keuangan</h1></div><span className={styles.role}>{data.roleLabel}</span></header><nav aria-label="Menu Keuangan" className="finance-menu"><Link href="/admin/keuangan">Ringkasan</Link><Link href="/admin/keuangan/pengeluaran">Pengajuan Keuangan</Link>{data.permissions.readApprovals&&<Link href="/admin/keuangan/approval">Approval Saya</Link>}{data.permissions.readMasters&&<Link href="/admin/keuangan/pengaturan">Jenis Program &amp; Pengaturan</Link>}</nav>{data.readOnly&&<p className={styles.notice}>Pratinjau modul nonaktif. Aktifkan modul melalui Core untuk mulai mencatat pengeluaran dan keputusan.</p>}<div>{children}</div></main>;
}
