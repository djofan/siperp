export interface ApiProblemDetails {
  code?: string; diagnosticCode?: string; requestId?: string; retryAfter?: number | null;
  message?: string; details?: Record<string, string[]>;
}
const fieldLabels: Record<string,string> = {"name": "Nama lengkap", "title": "Judul", "description": "Deskripsi", "content": "Isi", "email": "Email", "phone": "Nomor HP", "password": "Password", "password_confirmation": "Konfirmasi password", "uniqueCode": "Kode unik", "unique_code": "Kode unik", "code": "Kode", "amount": "Nominal", "targetAmount": "Target nominal", "currentAmount": "Saldo", "image": "Gambar", "logo": "Logo", "file": "Berkas", "files": "Berkas", "caption": "Keterangan foto", "status": "Status", "source": "Sumber", "region": "Wilayah", "address": "Alamat", "street": "Alamat", "nik": "NIK", "birthDate": "Tanggal lahir", "birthPlace": "Tempat lahir", "gender": "Jenis kelamin", "housing": "Status rumah", "rent": "Biaya sewa", "rentPeriod": "Periode sewa", "income": "Penghasilan", "incomePeriod": "Periode penghasilan", "dependentCount": "Jumlah tanggungan", "dependents": "Tanggungan", "relationship": "Hubungan", "age": "Usia", "problem": "Masalah yang dihadapi", "previousAid": "Riwayat bantuan", "previousAidDetails": "Detail bantuan sebelumnya", "program": "Program bantuan", "reason": "Alasan", "notes": "Catatan", "date": "Tanggal", "startDate": "Tanggal mulai", "endDate": "Tanggal selesai", "role": "Peran akun", "roles": "Peran akun", "userId": "Akun", "accountId": "Akun", "bank": "Bank", "accountNumber": "Nomor rekening", "accountName": "Nama pemilik rekening", "recipientName": "Nama penerima", "transferDate": "Tanggal transfer", "transferProof": "Bukti transfer", "verifierId": "Verifikator", "distributorId": "Penyalur", "distributionType": "Jenis penyaluran", "version": "Versi data", "duration": "Durasi", "recording": "Rekaman", "audio": "Rekaman", "video": "Video", "participants": "Peserta", "meetingDate": "Tanggal rapat", "location": "Lokasi", "summary": "Ringkasan", "agenda": "Agenda", "task": "Tugas", "assignee": "Penanggung jawab", "dueDate": "Tenggat", "question": "Pertanyaan", "answer": "Jawaban", "options": "Pilihan jawaban", "score": "Nilai", "quantity": "Jumlah", "price": "Harga", "cost": "Biaya", "estimate": "Estimasi biaya", "finalPrice": "Harga akhir", "capital": "Modal", "customerName": "Nama pelanggan", "customerPhone": "Nomor HP pelanggan", "device": "Perangkat", "complaint": "Keluhan", "publicationConsent": "Persetujuan publikasi", "isPinned": "Pin campaign", "documentationPhotos": "Dokumentasi", "reporter": "Pelapor", "applicant": "Pemohon", "survey": "Survei", "handover": "Penyerahan", "rtRw": "RT/RW", "village": "Desa/kelurahan", "district": "Kecamatan", "city": "Kota/kabupaten", "job": "Pekerjaan", "informationSource": "Sumber informasi"};
export function validationFieldLabel(field: string): string {
  const parts=field.split('.'), key=[...parts].reverse().find(part=>!/^\d+$/.test(part))??field;
  const label=fieldLabels[field]??fieldLabels[key]??'Isian';
  const index=parts.find(part=>/^\d+$/.test(part));
  return index===undefined?label:`${label} pada baris ${Number(index)+1}`;
}
export function readableValidationMessage(message: string, field=''): string {
  const label=validationFieldLabel(field);
  if (/required|must be present|cannot be empty/i.test(message)) return `${label} wajib diisi.`;
  if (/already been taken|already exists/i.test(message)) return `${label} sudah digunakan. Gunakan yang berbeda.`;
  if (/confirmation.*match|confirmed|does not match/i.test(message)) return `${label} tidak cocok. Periksa kembali.`;
  if (/valid email/i.test(message)) return `${label} harus berupa alamat email yang valid.`;
  const bound=message.match(/(?:at least|greater than or equal to) (\d+)/i);
  if(bound)return `${label} minimal ${bound[1]}${/characters/i.test(message)?' karakter':''}.`;
  const max=message.match(/(?:greater than|at most|maximum of) (\d+)/i);
  if(max)return `${label} maksimal ${max[1]}${/characters/i.test(message)?' karakter':/kilobytes/i.test(message)?' KB':''}.`;
  const digits=message.match(/(?:be|have) (\d+) digits/i);
  if(digits)return `${label} harus terdiri dari ${digits[1]} digit angka.`;
  if (/selected.*invalid|must be one of/i.test(message)) return `${label} tidak tersedia. Pilih kembali dari pilihan yang ada.`;
  if (/must be.*(?:integer|number|numeric)/i.test(message)) return `${label} harus berupa angka yang valid.`;
  if (/must be.*date/i.test(message)) return `${label} belum sesuai. Periksa tanggal yang diisi.`;
  if (/^The .+ (?:field|must|is|has)|^validation\./i.test(message)) return `${label} belum sesuai. Periksa isian ini.`;
  const clean=message.replace(/\s*\((?:Kode|Code|HTTP)[^)]*\)/gi,'').trim();
  if(!clean)return `${label} belum sesuai. Periksa isian ini.`;
  return field&&label!=='Isian'&&!clean.toLowerCase().includes(label.toLowerCase())?`${label}: ${clean}`:clean;
}
type ProblemBody={error?:ApiProblemDetails|string;errors?:Record<string,string[]>;message?:string};
export function describeApiProblem(body: ProblemBody|null, status: number, fallback='Permintaan belum berhasil diproses.', translate:(message:string,field?:string)=>string=readableValidationMessage):string {
  const problem=body?.error;
  const details=typeof problem==='object'?problem?.details:body?.errors;
  const messages=details&&Object.entries(details).flatMap(([field,values])=>Array.isArray(values)?values.filter((v):v is string=>typeof v==='string'&&!!v.trim()).map(value=>readableValidationMessage(translate(value,field),field)):[]);
  if(messages?.length){const unique=Array.from(new Set(messages));return unique.slice(0,3).join(' ')+(unique.length>3?' Periksa juga kolom lain yang ditandai.':'');}
  const raw=typeof problem==='string'?problem:problem?.message??body?.message;
  const message=typeof raw==="string"?raw.replace(/\s*\((?:Kode|Code|HTTP)[^)]*\)/gi,'').trim():undefined;
  if(message&&!/An unexpected error occurred|^(?:Unauthenticated|Unauthorized|Forbidden|Not Found|Too Many Requests|Internal Server Error|Service Unavailable|Page Expired|The given data was invalid)[.!]?$|SQLSTATE|Stack trace|^[A-Z][A-Z_0-9]{4,}$|<html|<!doctype/i.test(message))return readableValidationMessage(message);
  return status===401||status===419?'Sesi berakhir. Silakan login kembali.':status===403?'Akun Anda tidak memiliki izin untuk tindakan ini. Hubungi admin modul.':status===404?'Data tidak ditemukan atau sudah tidak tersedia. Muat ulang daftar.':status===409?'Data sudah berubah atau sedang diproses. Muat ulang sebelum melanjutkan.':status===413?'Berkas terlalu besar. Kecilkan ukurannya lalu unggah kembali.':status===429?'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.':status===502||status===503?'Layanan belum dapat dihubungi. Coba beberapa saat lagi atau hubungi admin.':status===504?'Server terlalu lama merespons. Periksa apakah data sudah tersimpan sebelum mencoba lagi.':status>=500?'Terjadi kendala pada server. Periksa apakah data sudah tersimpan; hubungi admin bila masih gagal.':fallback;
}
