import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { TechnicianUser } from "../../api/access";
import { catalogAction } from "../../api/catalog-actions";
import { ActionForm } from "../ActionForm";
import { Field } from "../Fields";
export async function CatalogForm({user,segments}:{user:TechnicianUser;segments:string[]}){
 const mode=segments[0]==="baru"?"new":segments[0]==="edit"?"edit":"";
 if(!mode||!user.canManage)notFound();
 const outlet=mode==="edit"?await prisma.teknisiOutlet.findUnique({where:{id:segments[1]??""}}):null;
 if(mode==="edit"&&!outlet)notFound();
 return <div className="tech-form-page"><Link href="/admin/teknisi/outlet">← Kembali ke outlet</Link><h1 className="mt-4">{mode==="new"?"Tambah":"Edit"} outlet</h1><div className="tech-box"><ActionForm action={catalogAction}><input type="hidden" name="mode" value={mode}/><input type="hidden" name="id" value={outlet?.id??""}/><div className="tech-form-grid"><Field name="name" label="Nama outlet" value={outlet?.name}/><Field name="phone" label="Nomor HP outlet" type="tel" value={outlet?.phone}/><div className="full"><Field name="address" label="Alamat outlet" maxLength={1000} value={outlet?.address}/></div>{outlet&&<label><input name="isActive" type="checkbox" defaultChecked={outlet.isActive}/> Outlet aktif</label>}</div></ActionForm></div></div>;
}
