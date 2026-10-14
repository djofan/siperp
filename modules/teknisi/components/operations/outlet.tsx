import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { TechnicianUser } from "../../api/access";
import { outletScope } from "../../api/policy";
import { operationalRoot } from "../../api/navigation";
export async function OutletView({user}:{user:TechnicianUser}){
 const root=operationalRoot(user.role);const outlets=await prisma.teknisiOutlet.findMany({where:outletScope(user),include:{technicians:{where:{isActive:true}},_count:{select:{tickets:true}}},orderBy:{name:"asc"}});
 return <><div className="tech-toolbar"><h1>{user.canManage?"Outlet":"Informasi outlet"}</h1>{user.canManage&&<Link className="tech-btn" href={`${root}/outlet/baru`}>+ Tambah outlet</Link>}</div><div className="tech-cards">{outlets.map(item=><article key={item.id} className="tech-ticket"><h2>{item.name}</h2><p>{item.address}</p><p>{item.phone}</p><p>{item.isActive?"Aktif":"Nonaktif"} · {item._count.tickets} servis tercatat</p><p>Teknisi: {item.technicians.map(tech=>tech.name).join(", ")||"Belum ada"}</p>{user.canManage&&<Link href={`${root}/outlet/edit/${item.id}`}>Edit outlet →</Link>}</article>)}</div>{!outlets.length&&<div className="tech-box">Belum ada outlet. Buat outlet sebelum mendaftarkan akun PTH.</div>}</>;
}
