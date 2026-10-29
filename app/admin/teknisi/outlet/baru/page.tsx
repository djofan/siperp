import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { createOutletForm } from "@/modules/teknisi/api/ui-actions";
import { ActionForm } from "@/modules/teknisi/components/ActionForm";
import { Field } from "@/modules/teknisi/components/Fields";
export default async function Page(){const user=await requireTechnicianAdminView();if(!user.canManage)notFound();return <div className="tech-form-page"><Link href="/admin/teknisi/outlet">← Daftar outlet</Link><h1 className="mt-4">Buat outlet</h1><p className="tech-note">Outlet dibuat melalui Laravel. Tidak mengubah database dari frontend.</p><section className="tech-box"><ActionForm action={createOutletForm}><div className="tech-form-grid"><Field name="name" label="Nama outlet"/><Field name="phone" label="No. HP outlet" type="tel" maxLength={30}/><div className="full"><Field name="address" label="Alamat outlet" maxLength={1000}/></div></div></ActionForm></section></div>;}
