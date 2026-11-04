"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Dialog, Input } from "./ui";
import { request } from "../api/client";
import s from "./Workspace.module.css";

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
  return <><Button variant="danger" onClick={()=>setOpen(true)}><Trash2 size={16}/> Hapus permanen</Button>
    {open&&<Dialog title="Hapus pengajuan permanen?" description={`${name} · ${number}`} onClose={()=>{if(!busy)setOpen(false);}}>
      <p>Data pengajuan, foto, hasil survei, riwayat, dan notifikasi akan dihapus permanen. Rincian dana terkait dikeluarkan dari grup dan totalnya diperbarui. Pengajuan lain tetap tersimpan. Tindakan ini tidak dapat dibatalkan.</p>
      <Input label={`Ketik ${number} untuk mengonfirmasi`} value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={busy} autoComplete="off"/>
      {error&&<p role="alert">{error}</p>}
      <div className={s.actions}><Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Batal</Button><Button variant="danger" disabled={busy||confirmation!==number} onClick={()=>void remove()}>{busy?"Menghapus…":"Ya, hapus permanen"}</Button></div>
    </Dialog>}
  </>;
}
