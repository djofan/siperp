import { describeApiProblem } from "@/lib/api-problem";

export class RequestError extends Error {
  constructor(message:string,public status:number,public fields:Record<string,string[]>={}){super(message);}
}
export function fieldMessage(value:string,field?:string):string{
  const labels:Record<string,string>={name:"Nama lengkap",password:"Password",password_confirmation:"Konfirmasi password",roles:"Peran akun",role:"Peran akun",region:"Wilayah",phone:"Nomor HP",email:"Email",canBypass:"Izin pengajuan langsung",active:"Status akun"};
  const label=field?(labels[field]??(field.startsWith("roles.")?"Pilihan peran akun":undefined)):undefined;
  if(/required|must be present/.test(value))return label?`${label} wajib diisi.`:"Kolom ini wajib diisi.";
  if(field==="password"&&/at least|minimum|minimal/.test(value))return "Password minimal 12 karakter.";
  if(field==="password"&&/greater than|maximum|maksimal/.test(value))return "Password maksimal 72 karakter.";
  if(/already been taken/.test(value))return `${label??"Data ini"} sudah digunakan. Gunakan data lain.`;
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
  });}catch{throw new RequestError("Koneksi ke server terputus. Periksa koneksi dan cek apakah data sudah tersimpan sebelum mencoba lagi. (Kode: API_CONNECTION_FAILED)",0);}
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if(response.status===401&&typeof window!=="undefined"&&window.location?.pathname?.startsWith("/bantuan-app/"))window.dispatchEvent(new Event("bantuan-session-expired"));
    const details = body?.error?.details;
    throw new RequestError(describeApiProblem(body,response.status,"Server belum dapat memproses permintaan. Hubungi admin dengan kode error yang ditampilkan.",fieldMessage),response.status,details??{});
  }
  if(!body)throw new RequestError("Respons server tidak berupa JSON. Hubungi admin untuk memeriksa proxy/API. (Kode: INVALID_API_RESPONSE)",502);
  return (unwrap ? body.data : body) as T;
}
export const money = (amount: number | null | undefined) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount ?? 0);
export const day = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
