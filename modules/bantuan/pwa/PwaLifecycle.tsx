"use client";
import { useEffect,useState } from "react";
import { Download,RefreshCw,WifiOff } from "lucide-react";
import s from "./Pwa.module.css";
interface InstallEvent extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export function PwaLifecycle() {
  const [offline,setOffline]=useState(false),[install,setInstall]=useState<InstallEvent|null>(null),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[issue,setIssue]=useState("");
  useEffect(()=>{
    const status=()=>setOffline(!navigator.onLine);status();
    const prompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent);};
    const installed=()=>setInstall(null);
    window.addEventListener("online",status);window.addEventListener("offline",status);window.addEventListener("beforeinstallprompt",prompt);window.addEventListener("appinstalled",installed);
    let live=true;let reload=false;
    const changed=()=>{if(reload)window.location.reload();};
    const update=()=>{reload=true;};window.addEventListener("bantuan-update-requested",update);
    if("serviceWorker" in navigator&&window.isSecureContext){
      navigator.serviceWorker.addEventListener("controllerchange",changed);
      void navigator.serviceWorker.register("/bantuan-app/sw.js",{scope:"/bantuan-app/",updateViaCache:"none"}).then(reg=>{
        if(!live)return;if(reg.waiting)setWaiting(reg.waiting);
        reg.addEventListener("updatefound",()=>{const worker=reg.installing;worker?.addEventListener("statechange",()=>{if(live&&worker.state==="installed"&&navigator.serviceWorker.controller)setWaiting(worker);});});
      }).catch(()=>{if(live)setIssue("Pemasangan aplikasi belum tersedia. Anda tetap bisa menggunakannya melalui browser.");});
    }
    return()=>{live=false;window.removeEventListener("online",status);window.removeEventListener("offline",status);window.removeEventListener("beforeinstallprompt",prompt);window.removeEventListener("appinstalled",installed);window.removeEventListener("bantuan-update-requested",update);if("serviceWorker" in navigator)navigator.serviceWorker.removeEventListener("controllerchange",changed);};
  },[]);
  return <div className={s.system}>
    {offline&&<div className={s.offline} role="status"><WifiOff size={17}/>Anda sedang offline. Perubahan memerlukan koneksi internet.</div>}
    {install&&<div className={s.install}><span>Pasang Bantuan SIP di layar utama HP.</span><button onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}}><Download size={16}/>Pasang</button><button aria-label="Tutup ajakan pemasangan" onClick={()=>setInstall(null)}>×</button></div>}
    {waiting&&<div className={s.install}><span>Versi baru tersedia. Selesaikan formulir sebelum memuat ulang.</span><button onClick={()=>{window.dispatchEvent(new Event("bantuan-update-requested"));waiting.postMessage({type:"SKIP_WAITING"});}}><RefreshCw size={16}/>Muat ulang</button></div>}
    {issue&&<div className={s.install} role="status"><span>{issue}</span><button aria-label="Tutup informasi" onClick={()=>setIssue("")}>×</button></div>}
  </div>;
}
