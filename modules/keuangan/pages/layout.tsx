import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getKeuanganOverview } from "../api/overview";
import styles from "../styles/workspace.module.css";
import "../styles/workflow.css";
import { FinanceShell } from "../components/FinanceShell";
export const metadata={title:"Keuangan | SIPERP",robots:{index:false,follow:false}};
export default async function FinanceLayout({children}:{children:React.ReactNode}) {
  const session = await getSession();
  if(!session)redirect("/admin/login");
  let data;
  try{data=await getKeuanganOverview();}catch(error){if(!(error instanceof ApiError)||![401,403,404].includes(error.status))throw error;return <main className={styles.workspace}><Link href="/admin">← Dashboard SIPERP</Link><h1>Keuangan</h1><p>Modul belum aktif atau akun tidak memiliki akses Keuangan. Hubungi pengelola.</p></main>;}
  return <FinanceShell name={session.name} role={data.roleLabel} pendingApprovals={data.counts.myPendingApprovals} permissions={data.permissions} showCore={session.isSuperadmin || session.moduleSlugs.length > 1}>
    {data.readOnly&&<p className="finance-warning">Pratinjau modul nonaktif. Aktifkan modul melalui Core untuk mulai mencatat pengeluaran dan keputusan.</p>}
    {children}
  </FinanceShell>;
}
