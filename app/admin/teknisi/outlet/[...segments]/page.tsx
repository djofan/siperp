import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { CatalogForm } from "@/modules/teknisi/components/operations/catalog-form";
export default async function Page({params}:{params:Promise<{segments:string[]}>}){return <CatalogForm user={await requireTechnicianAdminView()} segments={(await params).segments}/>;}
