import { redirect,notFound } from "next/navigation";
import { getSession,hasModuleAccess } from "@/lib/auth";
import { apiRequest,ApiError } from "@/lib/api";
import type { BantuanViewer } from "@/contracts/modules/bantuan";
import { PwaApp } from "./PwaApp";
import { validPwaRoute,pwaHome } from "./policy";
import Link from "next/link";
import s from "./Pwa.module.css";
export default async function PwaPage({params}:{params:Promise<{path?:string[]}>}) {
  const {path=[]}=await params;
  if(!path.length)redirect(pwaHome);
  const session=await getSession();
  if(!session)redirect("/bantuan-app/login");
  if(!hasModuleAccess(session,"bantuan"))return <main className={s.gate}><h1>Akses Bantuan diperlukan</h1><p>Hubungi pengelola untuk mengaktifkan akses modul Bantuan pada akun Anda.</p><Link href="/bantuan-app/login">Gunakan akun lain</Link><Link href="/admin">Buka dashboard web</Link></main>;
  let viewer:BantuanViewer;
  try {viewer=await apiRequest<BantuanViewer>("bantuan/viewer");}
  catch(error) {
    if(error instanceof ApiError&&error.status===401)redirect("/bantuan-app/login");
    if(error instanceof ApiError&&error.status===403)return <main className={s.gate}><h1>Modul belum dapat dibuka</h1><p>Akses Bantuan tidak tersedia. Hubungi pengelola.</p><Link href="/bantuan-app/login">Kembali ke login</Link></main>;
    throw error;
  }
  if(!validPwaRoute(path,viewer))notFound();
  return <PwaApp key={`${viewer.id}:${path.join("/")}`} viewer={viewer} route={path}/>;
}
