import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { ReportView } from "@/modules/teknisi/components/operations/report";
export default async function Page({searchParams}:{searchParams:Promise<{month?:string;outlet?:string}>}){return <ReportView user={await requireTechnicianAdminView()} searchParams={searchParams}/>;}
