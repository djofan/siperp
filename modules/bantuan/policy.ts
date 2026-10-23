import type { BantuanViewer } from "@/contracts/modules/bantuan";

export const homeByRole: Record<string, string> = {
  admin: "", call_center: "screening", approver: "review", chair: "review",
  verifier: "survei", fund_requester: "dana", treasurer: "pencairan",
};
export const href = (view = "") => `/admin/bantuan${view ? "/"+view : ""}`;
export const finalStates = ["completed","rejected_screening","rejected_t1","rejected_t2","rejected_bypass","cancelled","returned"];
export interface NavEntry { key: string; label: string; icon: string; group: string; states?: string[] }
const entry = (key:string,label:string,icon:string,states?:string[]):NavEntry=>({key,label,icon,group:"Operasional",states});
const overview = entry("","Dashboard","layout");
const all = entry("pengajuan","Semua pengajuan","files");
const reports = entry("laporan","Laporan penyaluran","chart");
const history = entry("riwayat","Riwayat","history",finalStates);
export function navigation(viewer: Pick<BantuanViewer,"role"|"canBypass">):NavEntry[] {
  const role=viewer.role;
  const items:Record<string,NavEntry[]>={
    admin:[overview,all,entry("penugasan","Penugasan","users",["survey_assignment","approved"]),entry("dana","Dana bantuan","wallet",["fund_ready","fund_submitted","fund_approved"]),reports,
      {key:"tim",label:"Pengguna & izin",icon:"users",group:"Pengaturan"},{key:"pengaturan",label:"Master data",icon:"settings",group:"Pengaturan"},{key:"audit",label:"Audit log",icon:"shield",group:"Pengaturan"}],
    call_center:[overview,entry("pengajuan/baru","Pengajuan baru","plus"),entry("screening","Antrean screening","inbox",["draft","screening","needs_data"]),
      entry("penugasan","Penugasan petugas","users",["survey_assignment","approved"]),all],
    approver:[overview,entry("review","Perlu keputusan","check",["review1","survey_submitted","review2","bypass_review"]),all,reports],
    chair:[overview,entry("review","Perlu keputusan","check",["review1","survey_submitted","review2","bypass_review"]),all,reports,
      {key:"audit",label:"Audit log",icon:"shield",group:"Pengawasan"}],
    verifier:[entry("survei","Tugas survei","clipboard",["survey_assigned"]),entry("penyaluran","Siap disalurkan","hand",["disbursed"]),history],
    fund_requester:[entry("dana","Perlu diajukan dananya","wallet",["fund_ready"]),entry("diajukan","Sudah diajukan","clock",["fund_submitted"]),history],
    treasurer:[entry("pencairan","Tiket pencairan","wallet",["fund_approved"]),entry("rekonsiliasi","Rekonsiliasi","check",["disbursed","delivery_failed"]),history],
  };
  const result=[...(items[role]??[])];
  if(viewer.canBypass&&["call_center","verifier"].includes(role))result.push(entry("pengajuan/langsung","Ajukan langsung","plus"));
  return result;
}
export function canViewRoute(viewer:Pick<BantuanViewer,"role"|"canBypass">, route:string[]):boolean {
  if(!route.length)return true;
  if(route[0]==="pengajuan"&&route[1]){
    if(route[1]==="baru")return ["admin","call_center"].includes(viewer.role);
    if(route[1]==="langsung")return viewer.canBypass&&["admin","call_center","verifier"].includes(viewer.role);
    if(route.length>3||route[2]&&route[2]!=="edit")return false;
    return route[2]!=="edit"||["admin","call_center","verifier"].includes(viewer.role);
  }
  return route.length===1&&navigation(viewer).some(item=>item.key===route[0]);
}
export function inboxStates(role:string):string[]{
  return ({admin:["screening","review1","survey_assignment","survey_submitted","bypass_review","approved","fund_ready","fund_submitted","fund_approved"],
    call_center:["draft","needs_data","screening","survey_assignment","approved"],
    approver:["review1","survey_submitted","review2","bypass_review"],chair:["review1","survey_submitted","review2","bypass_review"],
    verifier:["survey_assigned","disbursed"],fund_requester:["fund_ready","fund_submitted"],treasurer:["fund_approved","disbursed","delivery_failed"]} as Record<string,string[]>)[role]??[];
}
export function nextStep(status:string, source="online"): { title:string; description:string; owner:string } {
  const values:Record<string,[string,string,string]>={
    draft:["Lengkapi lalu kirim pengajuan","Draft belum masuk antrean petugas. Lengkapi data dan kedua foto sebelum dikirim.","Pembuat pengajuan"],
    needs_data:["Lengkapi data yang diminta","Baca alasan pengembalian, perbarui data, lalu kirim kembali.","Call Center"],
    screening:["Menunggu screening","Pengajuan sudah masuk antrean screening. Call Center menilai kelayakan awal.","Call Center"],
    review1:["Menunggu keputusan tahap 1","Penyetuju akan menentukan apakah pengajuan dilanjutkan ke survei.","Approver / Ketua Yayasan"],
    survey_assignment:["Tentukan petugas survei","Pilih Verifikator sesuai wilayah agar kunjungan dapat dimulai.","Call Center"],
    survey_assigned:["Lakukan survei lapangan","Periksa data pemohon, isi hasil kunjungan, dan lengkapi slot foto.","Verifikator yang ditugaskan"],
    survey_submitted:["Menunggu keputusan nominal","Hasil survei sudah terkirim. Penyetuju meninjau dan menetapkan nominal.","Approver / Ketua Yayasan"],
    review2:["Tinjau ulang pengajuan","Periksa catatan pengembalian dana sebelum menetapkan nominal kembali.","Approver / Ketua Yayasan"],
    bypass_review:["Menunggu keputusan langsung","Pengajuan langsung tidak melewati screening dan survei. Penyetuju menetapkan keputusan.","Approver / Ketua Yayasan"],
    approved:["Tentukan penyalur bantuan",source==="bypass"?"Pilih Verifikator penyalur atau Bendahara langsung.":"Pilih Verifikator yang akan menyerahkan bantuan.","Call Center"],
    fund_ready:["Ajukan dana di web dana","Pengaju Dana memproses di web lain, lalu menandai Dana Diajukan di sini.","Pengaju Dana"],
    fund_submitted:["Menunggu hasil pengajuan dana","Setelah ada keputusan di web dana, perbarui penandanya di sini.","Pengaju Dana"],
    fund_approved:["Catat pencairan dana","Bendahara melakukan transfer manual, lalu mengunggah buktinya.","Bendahara LAZSIP"],
    disbursed:["Serahkan bantuan & lengkapi bukti","Foto penyerahan dan sertifikat wajib sebelum pengajuan dapat diselesaikan.","Penyalur bantuan"],
    completed:["Bantuan selesai diserahkan","Penyerahan dan bukti telah tercatat. Tidak ada tindakan lanjutan.","Selesai"],
    delivery_failed:["Catat pengembalian dana","Koordinasikan pengembalian ke Bendahara dan unggah bukti pengembaliannya.","Bendahara LAZSIP"],
    returned:["Dana telah dikembalikan","Riwayat pengembalian tersimpan. Pembukaan kembali memerlukan keputusan penyetuju.","Approver / Ketua Yayasan"],
  };
  const [title,description,owner]=values[status]??["Pengajuan ditutup","Baca alasan keputusan pada tab riwayat. Hanya penyetuju dapat membuka kembali.","Approver / Ketua Yayasan"];
  return {title,description,owner};
}
