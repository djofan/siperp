"use client";
import { useEffect,useRef,useState } from "react";
import { BellRing,BellOff } from "lucide-react";
import { readPushContext,registerPwaPush,disablePwaPush,pushSupported,pushOptedIn,pushError,type PushContext } from "./push-client";
import s from "./Pwa.module.css";
import { pwaRequest } from "./client";
import { WebPushSettings } from "./WebPushSettings";
import type { PushConfiguration } from "./web-push";

export function PwaPushControl({viewerId,showControls}:{viewerId:string;showControls:boolean}) {
  const [webPush,setWebPush]=useState(false);
  const [context,setContext]=useState<PushContext|null>(null),[supported,setSupported]=useState<boolean|null>(null),[permission,setPermission]=useState<NotificationPermission>("default"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const refreshing=useRef(false);
  useEffect(()=>{
    let live=true;
    const refresh=async()=>{
      if(refreshing.current)return;refreshing.current=true;
      try {
        const can=pushSupported();if(live){setSupported(can);if("Notification" in window)setPermission(Notification.permission);}
        if(!can)return;
        const config=await pwaRequest<PushConfiguration>("web-push/config");
        if(!live)return;
        setWebPush(config.enabled);
        if(config.enabled)return;
        const data=await readPushContext();if(!live)return;setContext(data);
        if(data.enabled&&Notification.permission==="granted"&&pushOptedIn()){
          const registered=await registerPwaPush(data,viewerId,true);if(live&&registered){setContext({...data,registered:true});setError("");}
        }else if(data.registered&&Notification.permission==="denied"){
          await disablePwaPush();if(live)setContext({...data,registered:false});
        }
      }catch(err){if(live)setError(pushError(err));}finally{refreshing.current=false;}
    };
    const onFocus=()=>{if(document.visibilityState==="visible")void refresh();};
    const message=(event:MessageEvent)=>{if(event.data?.type==="BANTUAN_PUSH_RECEIVED")window.dispatchEvent(new Event("bantuan-push-received"));};
    void refresh();window.addEventListener("focus",onFocus);document.addEventListener("visibilitychange",onFocus);navigator.serviceWorker?.addEventListener("message",message);
    return()=>{live=false;window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onFocus);navigator.serviceWorker?.removeEventListener("message",message);};
  },[viewerId]);
  async function enable(){
    setBusy(true);setError("");setNotice("");
    try {
      // Keep the browser permission prompt attached to the user's click (iOS included).
      const result=await Notification.requestPermission();setPermission(result);
      if(result!=="granted"){setNotice(result==="denied"?"Izin ditolak. Ubah melalui pengaturan browser/perangkat jika ingin mengaktifkannya.":"Izin belum diberikan. Anda dapat mencoba kembali nanti.");return;}
      const current=await readPushContext();await registerPwaPush(current,viewerId);setContext({...current,registered:true});setNotice("Perangkat terdaftar. Notifikasi baru akan dikirim oleh server.");
    }catch(err){setError(pushError(err));}finally{setBusy(false);}
  }
  async function disable(){setBusy(true);setError("");setNotice("");try{await disablePwaPush();setContext(current=>current?{...current,registered:false}:null);setNotice("Push dinonaktifkan untuk sesi ini. Izin browser tidak diubah.");}catch(err){setError(pushError(err));}finally{setBusy(false);}}
  if(webPush)return <WebPushSettings userId={viewerId} visible={showControls}/>;
  if(!showControls)return null;
  return <section className={s.panel} aria-label="Pengaturan push notifikasi"><h2><BellRing size={19}/>Notifikasi di HP</h2>
    {supported===null?<p>Memeriksa dukungan browser…</p>:!supported?<p>Gunakan HTTPS dan browser yang mendukung notifikasi. Pada iPhone, pasang aplikasi melalui Safari → Bagikan → Tambahkan ke Layar Utama terlebih dahulu.</p>:<>
      <p>{!context?"Memeriksa konfigurasi server…":!context.enabled?"Push PWA belum dikonfigurasi pengelola. Daftar notifikasi dalam aplikasi tetap dapat digunakan.":context.registered&&permission==="granted"?"Perangkat ini terdaftar untuk menerima push, termasuk saat PWA tidak dibuka. Pengiriman tetap mengikuti koneksi dan kebijakan perangkat.":permission==="denied"?"Notifikasi diblokir di browser/perangkat. Buka pengaturan situs untuk mengizinkannya.":"Aktifkan untuk menerima pemberitahuan pembaruan bantuan di HP."}</p>
      {context?.enabled&&(context.registered?<button className={s.outline} disabled={busy} onClick={()=>void disable()}><BellOff size={16}/> {busy?"Memproses…":"Nonaktifkan push"}</button>:<button className={s.primary} disabled={busy||permission==="denied"} onClick={()=>void enable()}>{busy?"Mendaftarkan perangkat…":"Aktifkan notifikasi"}</button>)}
    </>}
    {error&&<p className={s.error} role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </section>;
}
