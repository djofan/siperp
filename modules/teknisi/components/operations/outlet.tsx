import Link from "next/link";
import type { TechnicianUser } from "../../api/access";
import { outletData } from "../../api/view-data";
export async function OutletView({user}:{user:TechnicianUser}){
 const outlets=await outletData();
 return <><header className="tech-dash-heading"><div><span className="tech-eyebrow">LOKASI LAYANAN</span><h1>{user.technician?"Informasi outlet":"Outlet"}</h1><p>Lokasi, kontak, dan jumlah servisan dari Laravel.</p></div>{user.canManage&&<Link className="tech-btn" href="/admin/teknisi/outlet/baru">+ Buat outlet</Link>}</header><div className="tech-cards">{outlets.map(o=><article className="tech-ticket" key={o.id}><div className="tech-card-head"><h2>{o.name}</h2><span>{o.isActive?"Aktif":"Nonaktif"}</span></div><p>{o.address}</p><p>{o.phone}</p><div className="tech-cost-row"><span>Teknisi</span><strong>{o._count.technicians}</strong></div><div className="tech-cost-row"><span>Servisan tercatat</span><strong>{o._count.tickets}</strong></div><Link href={`${user.technician?"/teknisi/panel":"/admin/teknisi"}/tiket?outlet=${encodeURIComponent(o.id)}`}>Lihat servisan →</Link></article>)}</div>{!outlets.length&&<section className="tech-box"><h2>Belum ada outlet</h2><p>Buat outlet sebelum mendaftarkan akun PTH.</p></section>}</>;
}
