"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Home,ClipboardList,Bell,User } from "lucide-react";
import type { BantuanViewer } from "@/contracts/modules/bantuan";
import { navigation,canViewRoute } from "../policy";
import { Workspace } from "../components/Workspace";
import { WorkspaceNavigation } from "../components/WorkspaceNavigation";
import { pwaWorkspaceRoute } from "./policy";
import s from "./PwaWorkspace.module.css";
export function PwaApp({viewer,route}:{viewer:BantuanViewer;route:string[]}){
  const workspace=pwaWorkspaceRoute(route,viewer),tab=workspace[0]??"";
  const hasWork=navigation(viewer).some(item=>item.key==="proses"||item.key==="pengajuan");
  useEffect(()=>{
    const expired=()=>window.location.replace("/bantuan-app/login");
    window.addEventListener("bantuan-session-expired",expired);
    return()=>window.removeEventListener("bantuan-session-expired",expired);
  },[]);
  return <WorkspaceNavigation><div className={s.root}>
    <Workspace route={workspace} initialViewer={viewer} mobileApp/>
    <nav className={s.nav} aria-label="Navigasi aplikasi" style={{gridTemplateColumns:`repeat(${hasWork?4:3},1fr)`}}>
      <Link href="/bantuan-app/beranda" aria-current={!tab||tab==="santunan"&&route[0]==="beranda"?"page":undefined}><Home size={21}/><span>Beranda</span></Link>
      {hasWork&&<Link href={canViewRoute(viewer,["proses"])?"/bantuan-app/workspace/proses":"/bantuan-app/workspace/pengajuan"} aria-current={tab==="proses"?"page":undefined}><ClipboardList size={21}/><span>Pekerjaan</span></Link>}
      <Link href="/bantuan-app/notifikasi" aria-current={tab==="notifikasi"?"page":undefined}><Bell size={21}/><span>Notifikasi</span></Link>
      <Link href="/bantuan-app/akun" aria-current={tab==="akun"?"page":undefined}><User size={21}/><span>Akun</span></Link>
    </nav>
  </div></WorkspaceNavigation>;
}
