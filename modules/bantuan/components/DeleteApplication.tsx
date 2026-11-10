"use client";
import { useState } from "react";
import { useWorkspaceRouter as useRouter } from "./WorkspaceNavigation";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "./ui";
import { request } from "../api/client";
import s from "./DeleteApplication.module.css";

export function DeleteApplication({id,number,name,version}:{id:string;number:string;name:string;version:number}){
  const router=useRouter();
  const [open,setOpen]=useState(false),[confirmation,setConfirmation]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function remove(){
    if(busy||confirmation!==number)return;
    setBusy(true);setError("");
    try{
      await request(`applications/${id}`,{method:"DELETE",body:JSON.stringify({version,confirmation})});
      router.push("/admin/bantuan/pengajuan");router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Pengajuan belum berhasil dihapus.");setBusy(false);}
  }
  return <><Button variant="danger" onClick={()=>{setConfirmation("");setError("");setOpen(true);}}><Trash2 size={16}/> Hapus permanen</Button>
    {open&&<Dialog title="Hapus pengajuan?" description="Penghapusan bersifat permanen dan tidak dapat dibatalkan." onClose={()=>{if(!busy)setOpen(false);}}>
      <div className={s.content}>
        <div className={s.application}><span className={s.icon}><Trash2 size={21}/></span><div><strong>{name}</strong><span>{number}</span></div></div>
        <div className={s.explanation}><strong>Data yang ikut dihapus</strong><p>Data pengajuan, foto, hasil survei, riwayat proses, dan notifikasi terkait.</p><p>Rincian dana dikeluarkan dari grup dan total dana diperbarui. Pengajuan lain tetap tersimpan.</p></div>
        <label className={s.confirmation}><span>Ketik <strong>{number}</strong> untuk mengonfirmasi</span><input aria-label="Nomor pengajuan untuk konfirmasi hapus" placeholder="Masukkan nomor pengajuan" value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false}/></label>
        {error&&<p className={s.error} role="alert">{error}</p>}
        <div className={s.actions}><Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Batal</Button><Button variant="danger" disabled={busy||confirmation!==number} onClick={()=>void remove()}><Trash2 size={16}/>{busy?"Menghapus…":"Hapus permanen"}</Button></div>
      </div>
    </Dialog>}
  </>;
}
