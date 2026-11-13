import { validateAttachment } from "../attachments";
import { describeApiProblem } from "@/lib/api-problem";
import type { PhotoLocation } from "@/contracts/modules/bantuan";
import { appendPhotoLocation } from "../photo-location";
import { draftsWithPrefix, putDraft, removeDraft } from "./vault";
import { preparePhotoUpload } from "./photos";
import { request, RequestError } from "./client";

export interface QueuedPhoto {
  id:string; applicationId:string;kind:string;name:string;mime:string;data:string;status:"queued"|"preparing"|"uploading"|"done"|"error";
  progress:number;attempts:number;nextTry:number;error?:string;prepared?:boolean;caption?:string;location?:PhotoLocation|null;
}
type Bucket={items:QueuedPhoto[];listeners:Set<()=>void>;initialized:boolean;pumping:boolean;paused?:boolean};
const buckets=new Map<string,Bucket>();
const EMPTY:QueuedPhoto[]=[];
function bucket(owner:string,applicationId:string):Bucket{
  const key=owner+":"+applicationId;let value=buckets.get(key);
  if(!value){value={items:EMPTY,listeners:new Set(),initialized:false,pumping:false};buckets.set(key,value);}return value;
}
function emit(value:Bucket){for(const listener of value.listeners)listener();}
function update(owner:string,app:string,id:string,patch:Partial<QueuedPhoto>){
  const b=bucket(owner,app);b.items=b.items.map(p=>p.id===id?{...p,...patch}:p);emit(b);return b.items.find(p=>p.id===id)!;
}
const storageKey=(photo:Pick<QueuedPhoto,"applicationId"|"id">)=>`photo:${photo.applicationId}:${photo.id}`;
const dataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Foto tidak dapat dibaca."));reader.readAsDataURL(blob);});
function asFile(p:QueuedPhoto):File{
  const encoded=p.data.slice(p.data.indexOf(",")+1),bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  return new File([bytes],p.name,{type:p.mime});
}
async function upload(photo:QueuedPhoto,onProgress:(n:number)=>void):Promise<void>{
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest(),body=new FormData();body.set("kind",photo.kind);body.set("file",asFile(photo));body.set("clientId",photo.id);
    if(photo.caption)body.set("caption",photo.caption);
    appendPhotoLocation(body,photo.location);
    xhr.open("POST",`/api/bantuan/applications/${photo.applicationId}/documents`);xhr.setRequestHeader("Accept","application/json");xhr.timeout=90000;
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onerror=()=>reject(new Error("Koneksi terputus. Foto menunggu dicoba ulang."));
    xhr.ontimeout=()=>reject(new Error("Unggahan terlalu lama. Coba lagi ketika sinyal membaik."));
    xhr.onload=()=>{
      if(xhr.status>=200&&xhr.status<300){
        try{const result=JSON.parse(xhr.responseText);if(typeof result?.data?.id!=="string")throw new Error();resolve();}
        catch{reject(new RequestError("Respons unggahan tidak valid. Periksa penyimpanan sebelum mencoba ulang. (Kode: INVALID_API_RESPONSE)",502));}return;
      }
      let body:Parameters<typeof describeApiProblem>[0]=null;try{body=JSON.parse(xhr.responseText);}catch{}
      if(xhr.status===401&&window.location.pathname.startsWith("/bantuan-app/"))window.dispatchEvent(new Event("bantuan-session-expired"));
      const message=xhr.status===413?"Berkas ditolak karena batas ukuran server. Maksimal aplikasi 10 MB; minta admin memeriksa batas unggahan PHP/Nginx. (HTTP 413)":describeApiProblem(body,xhr.status,"Unggahan ditolak server. Coba lagi atau hubungi admin dengan kode berikut.");
      reject(new RequestError(message,xhr.status));
    };

    xhr.send(body);
  });
}
export function subscribePhotos(owner:string,app:string,listener:()=>void){const b=bucket(owner,app);b.listeners.add(listener);return()=>{b.listeners.delete(listener);};}
export function photoSnapshot(owner:string,app:string){return bucket(owner,app).items;}
export function emptyPhotos(){return EMPTY;}
export function pausePhotos(owner:string,app:string,paused:boolean){bucket(owner,app).paused=paused;}
export async function discardLocalPhotos(owner:string,app:string){
  const b=bucket(owner,app);
  b.paused=true;
  for(const photo of b.items)await removeDraft(owner,storageKey(photo));
  b.items=[];emit(b);
}
export async function startPhotos(owner:string,app:string){
  const b=bucket(owner,app);
  if(!b.initialized){
    b.initialized=true;
    try{
      const saved=await draftsWithPrefix<QueuedPhoto>(owner,"photo:"+app+":");
      b.items=saved.map(p=>["preparing","uploading"].includes(p.status)?{...p,status:"queued" as const,progress:0}:p);
      emit(b);
    }catch{b.initialized=false;throw new Error("Antrean foto lokal tidak dapat dibuka. Periksa ruang penyimpanan perangkat.");}
  }
  void pumpPhotos(owner,app);
}
export async function addPhotos(owner:string,app:string,kind:string,files:File[],captions:string[]=[],location?:PhotoLocation|null){
  files.forEach(validateAttachment);
  for(const file of files){
    const photo:QueuedPhoto={id:crypto.randomUUID(),applicationId:app,kind,location,caption:captions[files.indexOf(file)]??"",name:file.name,mime:file.type,data:await dataUrl(file),status:"queued",progress:0,attempts:0,nextTry:0};
    await putDraft(owner,storageKey(photo),photo);
    const b=bucket(owner,app);b.items=[...b.items,photo];emit(b);
  }void pumpPhotos(owner,app);
}
export async function retryPhoto(owner:string,app:string,id:string){
  const p=update(owner,app,id,{status:"queued",nextTry:0,error:undefined});await putDraft(owner,storageKey(p),p);void pumpPhotos(owner,app);
}
export async function removePhoto(owner:string,app:string,id:string,server=false){
  const p=bucket(owner,app).items.find(p=>p.id===id);
  if(p&&["uploading","preparing"].includes(p.status))throw new Error("Tunggu unggahan selesai sebelum mengganti foto.");
  if(server||(p?.attempts??0)>0){
    try{await request(`documents/${id}`,{method:"DELETE"});}catch(error){if(!(error instanceof RequestError)||error.status!==404)throw error;}
  }
  await removeDraft(owner,`photo:${app}:${id}`);
  const b=bucket(owner,app);b.items=b.items.filter(p=>p.id!==id);emit(b);
}
export async function pumpPhotos(owner:string,app:string){
  const b=bucket(owner,app);if(b.paused||b.pumping||!navigator.onLine)return;b.pumping=true;
  try{
    while(true){
      let item=b.items.find(p=>(p.status==="queued"||p.status==="error"&&p.attempts<3)&&p.nextTry<=Date.now());
      if(b.paused||!item||!navigator.onLine)break;
      item=update(owner,app,item.id,{attempts:item.attempts+1});
      try{
        if(!item.prepared){
          item=update(owner,app,item.id,{status:"preparing"});
          const {file,location}=await preparePhotoUpload(asFile(item),item.location);
          item=update(owner,app,item.id,{name:file.name,mime:file.type,data:await dataUrl(file),prepared:true,location});
        }
        item=update(owner,app,item.id,{status:"uploading",progress:0});
        await putDraft(owner,storageKey(item),item);
        const id=item.id;await upload(item,progress=>update(owner,app,id,{progress}));
        item=update(owner,app,id,{status:"done",progress:100,error:undefined});
      }catch(error){
        item=update(owner,app,item.id,{status:"error",progress:0,error:error instanceof Error?error.message:"Berkas gagal diproses.",attempts:error instanceof RequestError&&error.status>=400&&error.status<500&&error.status!==429?3:item.attempts,nextTry:Date.now()+30000});
      }
      await putDraft(owner,storageKey(item),item);
    }
  }finally{b.pumping=false;}
}
export function clearPhotoMemory(owner:string){for(const key of buckets.keys())if(key.startsWith(owner+":"))buckets.delete(key);}
