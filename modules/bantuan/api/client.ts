export class RequestError extends Error {
  constructor(message:string,public status:number,public fields:Record<string,string[]>={}){super(message);}
}
export function fieldMessage(value:string):string{
  if(/required|must be present/.test(value))return "Kolom ini wajib diisi.";
  if(/16 digits|digits/.test(value))return "NIK harus terdiri dari 16 digit angka.";
  if(/email/.test(value))return "Masukkan alamat email yang valid.";
  if(/date/.test(value))return "Periksa tanggal; tidak boleh melewati hari ini.";
  if(/selected.*invalid|must be one of/.test(value))return "Pilih salah satu pilihan yang tersedia.";
  if(/integer|number|numeric/.test(value))return "Masukkan angka yang valid.";
  return value;
}
export async function request<T>(path: string, init: RequestInit = {}, unwrap = true): Promise<T> {
  let response:Response;
  try{response = await fetch(`/api/bantuan/${path}`, {
    ...init, cache: "no-store", headers: { Accept: "application/json", ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });}catch{throw new RequestError("Koneksi terputus. Draft tetap disimpan pada perangkat ini.",0);}
  const body = await response.json();
  if (!response.ok) {
    const details = body.error?.details;
    const first = details && typeof details === "object" ? Object.values(details).flat()[0] : null;
    const message=typeof first === "string" ? fieldMessage(first) : typeof body.error === "string" ? body.error : body.error?.message;
    throw new RequestError(!message||message==="An unexpected error occurred."?"Server belum dapat memproses permintaan. Silakan coba lagi.":message,response.status,details??{});
  }
  return (unwrap ? body.data : body) as T;
}
export const money = (amount: number | null | undefined) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount ?? 0);
export const day = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
