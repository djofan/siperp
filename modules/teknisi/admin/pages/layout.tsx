import { Workspace } from "../../components/Workspace";
import { requireTechnicianAdminView } from "../../api/access";
import { getSession } from "@/lib/auth";
export const metadata={title:{default:"Teknisi HP",template:"%s | Teknisi HP"},robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}){
 const user=await requireTechnicianAdminView(),session=await getSession();
 const roleLabel=session?.isSuperadmin?"Superadmin":user.role==="manager"?"Manajer":user.role==="monitoring"?"Monitoring":"Administrator";
 return <Workspace name={user.name} roleLabel={roleLabel} outletName="Seluruh outlet" root="/admin/teknisi" admin>{children}</Workspace>;
}
