import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { WorkflowForm } from "@/modules/teknisi/components/operations/workflow-form";
export default async function Page({params}:{params:Promise<{id:string;operation:string}>}){const user=await requireTechnicianOperator();return <WorkflowForm user={user} params={params} root="/teknisi/panel"/>;}
