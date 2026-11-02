import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import type { CoreModule } from "@/modules/core/modules";
import s from "./CoreMinimal.module.css";
import { ModuleAdminHome } from "./ModuleAdminHome";

export function CoreDashboard({name,isSuperadmin,modules,totalModules,totalUsers,managedModules}:{name:string;isSuperadmin:boolean;modules:CoreModule[];totalModules:number;totalUsers:number|null;managedModules:number}){
  if(!isSuperadmin)return <ModuleAdminHome name={name} modules={modules} managedModules={managedModules}/>;
  const actions=isSuperadmin?[
    {href:"/admin/super/akun",title:"Akun & akses",text:"Kelola admin dan izin modul"},
    {href:"/admin/super/keuangan",title:"Keuangan",text:"Transaksi dan rekonsiliasi"},
    {href:"/admin/super/modul",title:"Pengaturan modul",text:"Atur ketersediaan platform"},
  ]:[{href:"/admin/modul",title:"Pilihan modul",text:"Masuk ke ruang kerja Anda"},{href:"/admin/akun-modul",title:"Anggota tim",text:"Kelola akun dan peran petugas"}];
  const stats=[{label:isSuperadmin?"Modul aktif":"Modul Anda",value:modules.length,href:"/admin/modul"},{label:isSuperadmin?"Akun terdaftar":"Modul dikelola",value:isSuperadmin?totalUsers??0:managedModules,href:isSuperadmin?"/admin/super/akun":"/admin/akun-modul"},...(isSuperadmin?[{label:"Modul nonaktif",value:Math.max(0,totalModules-modules.length),href:"/admin/super/modul"}]:[])];
  return <div className={s.page} data-role={isSuperadmin?"super":"admin"}>
    <header className={s.heading}><div><p>{isSuperadmin?"Pusat kendali":"Ruang kerja admin"}</p><h1>Halo, {name.split(" ")[0]}.</h1><span>{isSuperadmin?"Ringkasan platform dan akses pengelolaan Anda.":"Pilih modul atau kelola tim untuk mulai bekerja."}</span></div><time>{new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date())}</time></header>
    <div className={s.stats}>{stats.map(stat=><Link href={stat.href} key={stat.label}><span>{stat.label}<ArrowUpRight size={15}/></span><strong>{stat.value.toLocaleString("id-ID")}</strong></Link>)}</div>
    <div className={s.content}><section><div className={s.sectionHeading}><h2>{isSuperadmin?"Ruang kerja modul":"Modul Anda"}</h2><Link href="/admin/modul">Lihat semua <ArrowUpRight size={14}/></Link></div><div className={s.modules}>{modules.map(module=><Link href={`/admin/${module.slug}`} key={module.id}><span className={s.moduleIcon}><Layers3 size={20}/></span><div><h3>{module.name}</h3><p>{module.description||"Buka ruang kerja modul."}</p></div><ArrowUpRight size={17}/></Link>)}</div>{!modules.length&&<p className={s.note}>Belum ada modul aktif yang dapat diakses. Hubungi Superadmin untuk mengatur akses Anda.</p>}</section>
    <aside className={s.aside}><h2>{isSuperadmin?"Kelola platform":"Kelola tim"}</h2><div className={s.actions}>{actions.map(action=><Link href={action.href} key={action.href}><div><h3>{action.title}</h3><p>{action.text}</p></div><ArrowUpRight size={16}/></Link>)}</div><p className={s.note}>{isSuperadmin?"Anda memiliki akses pengelolaan seluruh platform.":"Akses modul mengikuti penugasan dari Superadmin."}</p></aside></div>
  </div>;
}
