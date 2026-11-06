import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { outletData } from "@/modules/teknisi/api/view-data";
import { editOutletForm } from "@/modules/teknisi/api/ui-actions";
import { ActionForm } from "@/modules/teknisi/components/ActionForm";
import { Field } from "@/modules/teknisi/components/Fields";

export default async function Page({params}:{params:Promise<{id:string}>}){
  const user=await requireTechnicianAdminView();
  if(!user.canManage)redirect("/admin/teknisi/outlet");
  const {id}=await params, outlets=await outletData(), outlet=outlets.find(row=>row.id===id);
  if(!outlet)notFound();
  return <section className="tech-form-page"><Link href="/admin/teknisi/outlet">← Outlet</Link><h1 className="mt-4">Edit outlet</h1><p className="tech-note">Perubahan nama tampil di panel, layanan publik, dan servisan terkait. Riwayat servis tidak dihapus.</p><div className="tech-box"><ActionForm action={editOutletForm.bind(null,id)} submit="Simpan perubahan" draftKey={`teknisi:${user.id}:outlet:${id}`}><div className="tech-form-grid"><Field name="name" label="Nama outlet" value={outlet.name}/><Field name="phone" label="No. HP outlet" type="tel" maxLength={30} value={outlet.phone}/><div className="full"><Field name="address" label="Alamat outlet" maxLength={1000} value={outlet.address}/></div></div></ActionForm></div></section>;
}
