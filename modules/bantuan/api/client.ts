import { describeApiProblem, readableValidationMessage } from "@/lib/api-problem";

export class RequestError extends Error {
  constructor(message:string,public status:number,public fields:Record<string,string[]>={}){super(message);}
}
export function fieldMessage(value:string,field?:string):string { return readableValidationMessage(value,field); }
export async function request<T>(path: string, init: RequestInit = {}, unwrap = true): Promise<T> {
  let response:Response;
  try{response = await fetch(`/api/bantuan/${path}`, {
    ...init, cache: "no-store", headers: { Accept: "application/json", ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });}catch{throw new RequestError("Koneksi ke server terputus. Periksa koneksi dan cek apakah data sudah tersimpan sebelum mencoba lagi.",0);}
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if(response.status===401&&typeof window!=="undefined"&&window.location?.pathname?.startsWith("/bantuan-app/"))window.dispatchEvent(new Event("bantuan-session-expired"));
    const details = body?.error?.details;
    throw new RequestError(describeApiProblem(body,response.status,"Server belum dapat memproses permintaan. Coba lagi atau hubungi admin bila masih gagal.",fieldMessage),response.status,details??{});
  }
  if(!body)throw new RequestError("Respons server belum dapat dibaca. Periksa apakah data sudah tersimpan sebelum mencoba lagi.",502);
  return (unwrap ? body.data : body) as T;
}
export const money = (amount: number | null | undefined) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount ?? 0);
export const day = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const formatIncome = (value: unknown) => typeof value === "number" ? money(value) : String(value ?? "").trim() || "Belum diisi";
