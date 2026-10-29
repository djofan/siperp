"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat2, Check } from "lucide-react";
import { bantuanRoles, type BantuanViewer } from "@/contracts/modules/bantuan";
import { request } from "../api/client";
import { href, homeByRole } from "../policy";
import { Button, Dialog } from "./ui";
import s from "./Workspace.module.css";

export function RoleSwitcher({ viewer }: { viewer: BantuanViewer }) {
  const router=useRouter();
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(viewer.role);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  if ((viewer.roles?.length ?? 0) < 2) return null;
  return <>
    <Button variant="secondary" type="button" onClick={() => { setSelected(viewer.role); setError(""); setOpen(true); }} aria-label="Ganti peran aktif"><Repeat2 size={15}/>{bantuanRoles[viewer.role]}</Button>
    {open && <Dialog title="Ganti peran aktif" description="Simpan pekerjaan yang sedang diisi sebelum berganti peran. Menu dan tindakan akan mengikuti peran yang dipilih." onClose={() => !busy && setOpen(false)}>
      <div role="radiogroup" aria-label="Peran aktif" style={{display:"grid",gap:10}}>{viewer.roles?.map(role => <button type="button" role="radio" aria-checked={selected===role} key={role} disabled={busy} className={`${s.button} ${s.secondary}`} style={{justifyContent:"space-between",background:selected===role?"#eaf4e2":undefined}} onClick={() => setSelected(role)}>{bantuanRoles[role]??role}{selected===role&&<Check size={17}/>}</button>)}</div>
      {error&&<p role="alert" className={s.fieldError}>{error}</p>}
      <div className={s.actions} style={{marginTop:22}}><Button variant="secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Batal</Button><Button type="button" disabled={busy||selected===viewer.role} onClick={async()=>{
        setBusy(true);setError("");
        try{await request("active-role",{method:"PUT",body:JSON.stringify({role:selected})});router.replace(href(homeByRole[selected]));router.refresh();}
        catch(error){setError(error instanceof Error?error.message:"Peran belum berhasil diganti.");setBusy(false);}
      }}>{busy?"Mengganti peran…":"Gunakan peran"}</Button></div>
    </Dialog>}
  </>;
}
