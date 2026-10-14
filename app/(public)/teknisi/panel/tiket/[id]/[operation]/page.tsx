import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { WorkflowForm } from "@/modules/teknisi/components/operations/workflow-form";
export default async function Page({params}:{params:Promise<{id:string;operation:string}>}){return <WorkflowForm user={await requireTechnicianOperator()} params={params} root="/teknisi/panel"/>;}
