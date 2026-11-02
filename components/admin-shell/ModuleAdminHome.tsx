import Link from "next/link";
import { ArrowRight, Layers3, Users } from "lucide-react";
import type { CoreModule } from "@/modules/core/modules";
import s from "./ModuleAdminHome.module.css";

export function ModuleAdminHome({name,modules,managedModules}:{name:string;modules:CoreModule[];managedModules:number}){
  return <div className={s.page}>
    <header><span>ADMIN MODUL</span><h1>Ruang kerja Anda</h1><p>Halo, {name}. Pilih modul untuk melanjutkan pekerjaan hari ini.</p></header>
    <section><div className={s.title}><h2>Mulai bekerja</h2><span>{modules.length} modul tersedia</span></div>
      <div className={s.modules}>{modules.map(module=><Link href={`/admin/${module.slug}`} key={module.id}><span className={s.icon}><Layers3 size={22}/></span><h3>{module.name}</h3><p>{module.description||"Kelola kegiatan dan pekerjaan dalam modul ini."}</p><span className={s.open}>Masuk ke modul <ArrowRight size={17}/></span></Link>)}</div>
      {!modules.length&&<p className={s.empty}>Belum ada modul aktif untuk akun Anda. Hubungi Superadmin untuk mendapatkan akses.</p>}
    </section>
    {managedModules>0&&<section className={s.team}><Users size={25}/><div><h2>Anggota tim Anda</h2><p>Buat akun petugas dan atur perannya pada {managedModules} modul yang Anda kelola.</p></div><Link href="/admin/akun-modul">Kelola anggota <ArrowRight size={16}/></Link></section>}
    <p className={s.hint}>Modul yang tampil mengikuti akses akun Anda. Perubahan akses modul diatur oleh Superadmin.</p>
  </div>;
}
