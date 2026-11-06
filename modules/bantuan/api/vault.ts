// Account-scoped encrypted drafts. No personal data is written to localStorage.
const DATABASE = "sip-bantuan-private-v1";
const TTL = 7 * 24 * 60 * 60 * 1000;
let database: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve,reject)=>{
    const req=indexedDB.open(DATABASE,1);
    req.onupgradeneeded=()=>{req.result.createObjectStore("records",{keyPath:"id"});req.result.createObjectStore("keys");};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(new Error("Penyimpanan draft pada perangkat tidak tersedia."));
  });
}
async function read<T>(store:string,id:string):Promise<T|undefined>{
  const db=await open();
  return new Promise((resolve,reject)=>{const req=db.transaction(store).objectStore(store).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
async function write(store:string,value:unknown,id?:string){
  const db=await open();return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(store,"readwrite");if(id)tx.objectStore(store).put(value,id);else tx.objectStore(store).put(value);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
const pendingKeys=new Map<string,Promise<CryptoKey>>();
async function keyFor(owner:string):Promise<CryptoKey>{
  let pending=pendingKeys.get(owner);
  if(!pending){pending=(async()=>{
    const found=await read<CryptoKey>("keys",owner);if(found)return found;
    const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
    // Recheck within one read/write transaction: two tabs must share one key.
    const db=await open();return new Promise<CryptoKey>((resolve,reject)=>{
      const tx=db.transaction("keys","readwrite"),store=tx.objectStore("keys"),req=store.get(owner);
      let chosen=key;
      req.onsuccess=()=>{if(req.result)chosen=req.result as CryptoKey;else store.add(key,owner);};
      tx.oncomplete=()=>resolve(chosen);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  })();pendingKeys.set(owner,pending);}return pending;
}
type Entry={id:string;owner:string;expires:number;iv:Uint8Array;cipher:ArrayBuffer};
export async function putDraft<T>(owner:string,id:string,value:T):Promise<void>{
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await keyFor(owner),new TextEncoder().encode(JSON.stringify(value)));
  await write("records",{id:owner+":"+id,owner,expires:Date.now()+TTL,iv,cipher});
}
export async function getDraft<T>(owner:string,id:string):Promise<T|null>{
  const entry=await read<Entry>("records",owner+":"+id);
  if(!entry)return null;
  if(entry.owner!==owner||entry.expires<Date.now()){await removeDraft(owner,id);return null;}
  try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:entry.iv as Uint8Array<ArrayBuffer>},await keyFor(owner),entry.cipher))) as T;}
  catch{throw new Error("Draft lokal tidak dapat dibuka. Gunakan draft yang sudah tersimpan di server.");}
}
export async function removeDraft(owner:string,id:string):Promise<void>{
  const db=await open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("records","readwrite");tx.objectStore("records").delete(owner+":"+id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
export async function draftsWithPrefix<T>(owner:string,prefix:string):Promise<T[]>{
  const db=await open();
  const entries=await new Promise<Entry[]>((resolve,reject)=>{const req=db.transaction("records").objectStore("records").getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const ids=entries.filter(e=>e.owner===owner&&e.id.startsWith(owner+":"+prefix)).map(e=>e.id.slice(owner.length+1));
  const values=await Promise.all(ids.map(id=>getDraft<T>(owner,id)));
  const result:T[]=[];for(const value of values)if(value!==null)result.push(value);return result;
}
export async function clearDrafts(owner:string):Promise<void>{
  const db=await open();await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(["records","keys"],"readwrite"),cursor=tx.objectStore("records").openCursor();
    cursor.onsuccess=()=>{const c=cursor.result;if(c){if((c.value as Entry).owner===owner)c.delete();c.continue();}};
    tx.objectStore("keys").delete(owner);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });pendingKeys.delete(owner);
}
