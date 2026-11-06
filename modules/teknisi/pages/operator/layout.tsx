import { requireTechnicianOperator } from "../../api/access";
import { outletData,profileData } from "../../api/view-data";
import { Workspace } from "../../components/Workspace";
export const metadata={title:{default:"Panel Outlet",template:"%s | Teknisi HP"},robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}){
 const user=await requireTechnicianOperator(),[outlets,profile]=await Promise.all([outletData(),profileData()]);
 const outlet=outlets.find(row=>row.id===user.technician.outletId);
 return <Workspace name={user.name} roleLabel="Teknisi" accountCode={profile?.nip} outletName={outlet?.name??"Penempatan belum tersedia"} root="/teknisi/panel">{children}</Workspace>;
}
