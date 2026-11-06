import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { ReportView } from "@/modules/teknisi/components/operations/report";
export default async function Page({searchParams}:{searchParams:Promise<{outlet?:string}>}){const user=await requireTechnicianAdminView();return <ReportView user={user} searchParams={searchParams} root="/admin/teknisi"/>;}
