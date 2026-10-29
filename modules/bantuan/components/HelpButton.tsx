"use client";
import { useState } from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { bantuanRoles, type BantuanViewer } from "@/contracts/modules/bantuan";
import { roleSteps } from "../workspace-guide";
import { Dialog } from "./ui";
import s from "./Usability.module.css";

export function HelpButton({viewer}:{viewer:BantuanViewer}){
  const [open,setOpen]=useState(false);
  return <><button type="button" className={s.helpButton} onClick={()=>setOpen(true)} aria-label="Buka panduan penggunaan"><CircleHelp size={17}/><span>Panduan</span></button>{open&&<Dialog title="Mulai dari mana?" description={`Panduan untuk peran ${bantuanRoles[viewer.role]??viewer.role}.`} onClose={()=>setOpen(false)}><div className={s.helpBody}><ol>{roleSteps(viewer.role).map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol><div className={s.terms}><div><strong>Draft belum dikirim</strong><p>Gunakan Simpan draft untuk melanjutkan nanti. Pengajuan mulai diproses setelah tombol Kirim pengajuan ditekan.</p></div><div><strong>Buka pengajuan untuk mengerjakan</strong><p>Periksa data dan dokumen, lalu buka tab Tindakan atau Hasil survei. Tombol yang tersedia mengikuti peran dan tahap pengajuan.</p></div>{(viewer.roles?.length??0)>1&&<div><strong>Punya beberapa peran?</strong><p>Gunakan tombol peran aktif di bagian atas. Simpan pekerjaan sebelum berganti peran.</p></div>}</div><div className={s.helpLinks}><Link href={viewer.role==="volunteer"?"/admin/bantuan/santunan":"/admin/bantuan/proses"} onClick={()=>setOpen(false)}>Buka pekerjaan saya →</Link>{viewer.role!=="volunteer"&&<Link href="/admin/bantuan/pengajuan" onClick={()=>setOpen(false)}>Cari pengajuan →</Link>}</div></div></Dialog>}</>;
}
