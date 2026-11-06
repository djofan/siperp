import { requireOjolMember } from "@/modules/ojol/api/access";
import { ReportPage } from "@/components/learning-reports/ReportPage";
export const metadata = { title: "Laporan peserta", robots: { index: false, follow: false } };
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await requireOjolMember("guru");
 return <ReportPage module="ojol" base="/ojol/guru/laporan" params={await searchParams}/>;
}
