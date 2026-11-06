import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { ReportPage } from "@/components/learning-reports/ReportPage";
export const metadata = { title: "Laporan peserta", robots: { index: false, follow: false } };
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await requireTanwirAdmin();
 return <ReportPage module="tanwir" base="/admin/tanwir/laporan" params={await searchParams}/>;
}
