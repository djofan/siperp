import { RequestError } from "../api/client";
export async function pwaRequest<T>(path:string,init:RequestInit={},unwrap=true):Promise<T> {
  let response:Response;
  try {response=await fetch(`/api/bantuan/${path}`,{...init,credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json",...(init.body?{"Content-Type":"application/json"}:{}),...init.headers}});}
  catch(error) {if(error instanceof DOMException&&error.name==="AbortError")throw error;throw new RequestError("Koneksi belum tersedia. Sambungkan internet lalu coba lagi.",0);}
  const result=await response.json().catch(()=>null);
  if(!response.ok) {
    if(response.status===401)window.dispatchEvent(new Event("bantuan-session-expired"));
    throw new RequestError(result?.error?.message??"Permintaan belum dapat diproses.",response.status);
  }
  return (unwrap?result?.data:result) as T;
}
