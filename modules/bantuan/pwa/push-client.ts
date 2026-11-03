import { pwaRequest } from "./client";

export interface PushContext {
  enabled:boolean;registered:boolean;userId:string;binding:string;
  firebase:{apiKey:string;projectId:string;messagingSenderId:string;appId:string}|null;
  vapidKey:string|null;
}
export const pushPreference="bantuan-pwa-push-enabled";
export class PushSetupError extends Error {}
export function pushSupported(){return window.isSecureContext&&"Notification" in window&&"PushManager" in window&&"serviceWorker" in navigator;}
export function pushOptedIn(){try{return localStorage.getItem(pushPreference)==="1";}catch{return false;}}
export function setPushPreference(enabled:boolean){try{if(enabled)localStorage.setItem(pushPreference,"1");else localStorage.removeItem(pushPreference);}catch{/* Permission is still enforced by the browser. */}}
export function readPushContext(signal?:AbortSignal){return pwaRequest<PushContext>("pwa/push-context",{signal});}

async function workerForPush() {
  const reg=await navigator.serviceWorker.register("/bantuan-app/sw.js",{scope:"/bantuan-app/",updateViaCache:"none"});
  if(!reg.active)await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(new PushSetupError("Aplikasi belum siap. Muat ulang lalu coba lagi.")),15000))]);
  const active=reg.active;
  if(!active)throw new PushSetupError("Service worker belum aktif. Muat ulang aplikasi.");
  await new Promise<void>((resolve,reject)=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();reject(new PushSetupError("Versi aplikasi belum mendukung push. Selesaikan formulir lalu tekan Muat ulang pada pemberitahuan pembaruan."));},3000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();if(event.data?.pushVersion===2)resolve();else reject(new PushSetupError("Perbarui aplikasi sebelum mengaktifkan notifikasi."));};
    active.postMessage({type:"BANTUAN_PUSH_CAPABILITIES"},[channel.port2]);
  });
  return reg;
}
let pending:Promise<unknown>=Promise.resolve();
function serialize<T>(action:()=>Promise<T>):Promise<T> {
  const run=async():Promise<T>=>{
    if(navigator.locks)return await navigator.locks.request("bantuan-pwa-push",action);
    return await action();
  };
  const next=pending.then(run,run);pending=next.catch(()=>undefined);return next;
}
export function registerPwaPush(context:PushContext,viewerId:string,automatic=false) {
  return serialize(async()=>{
  if(automatic&&!pushOptedIn())return false;
  if(context.userId!==viewerId){window.location.reload();throw new PushSetupError("Akun telah berganti. Aplikasi sedang dimuat ulang.");}
  if(!context.enabled||!context.firebase||!context.vapidKey)throw new PushSetupError("Firebase Web dan VAPID belum dikonfigurasi pengelola.");
  if(Notification.permission!=="granted")throw new PushSetupError("Izin notifikasi belum diberikan pada browser.");
  const [{getApps,initializeApp},{getMessaging,getToken,isSupported}]=await Promise.all([import("firebase/app"),import("firebase/messaging")]);
  if(!await isSupported())throw new PushSetupError("Browser ini belum mendukung push. Pada iPhone, pasang PWA melalui Safari terlebih dahulu.");
  const reg=await workerForPush(),appName=`bantuan-pwa-${context.firebase.projectId}`;
  const app=getApps().find(candidate=>candidate.name===appName)??initializeApp(context.firebase,appName);
  const token=await getToken(getMessaging(app),{vapidKey:context.vapidKey,serviceWorkerRegistration:reg});
  if(!token)throw new PushSetupError("Browser belum menghasilkan token perangkat. Coba lagi.");
  if(automatic&&!pushOptedIn())return false;
  await pwaRequest("pwa/devices",{method:"POST",body:JSON.stringify({token})});
  setPushPreference(true);
  return true;
  });
}
export function disablePwaPush() {
  setPushPreference(false);
  return serialize(async()=>{
  setPushPreference(false);
  await pwaRequest("pwa/devices",{method:"DELETE"});
  const reg=await navigator.serviceWorker?.getRegistration("/bantuan-app/");
  if(reg){const subscription=await reg.pushManager.getSubscription();await subscription?.unsubscribe();for(const note of await reg.getNotifications())note.close();}
  });
}
export function pushError(error:unknown) {
  if(error instanceof PushSetupError)return error.message;
  const code=error&&typeof error==="object"&&"code" in error?String(error.code):"";
  if(code.includes("permission-blocked"))return "Izin diblokir. Izinkan notifikasi pada pengaturan browser atau perangkat.";
  return "Pendaftaran push belum berhasil. Periksa koneksi, konfigurasi Firebase Web/VAPID, dan coba lagi.";
}
