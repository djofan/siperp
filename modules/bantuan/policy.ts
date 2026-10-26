import type { BantuanViewer } from "@/contracts/modules/bantuan";

export const homeByRole: Record<string, string> = {
  admin: "", call_center: "screening", approver: "review", chair: "review",
  verifier: "survei", volunteer:"santunan", fund_requester: "dana", treasurer: "pencairan",
};
export const href = (view = "") => `/admin/bantuan${view ? "/"+view : ""}`;
export const finalStates = ["completed","rejected_screening","rejected_t1","rejected_t2","rejected_bypass","cancelled","returned"];
export interface NavEntry {
  key:string; label:string; icon:string; group:string; states?:string[];
  description?:string; task?:"survey"|"distribution";
}
interface ProcessEntry extends NavEntry {roles:string[]}
const process=(key:string,label:string,group:string,states:string[],roles:string[],description:string,icon="inbox",task?:ProcessEntry["task"]):ProcessEntry=>({key,label,group,states,roles,description,icon,task});

// One source for menu visibility, server guards, queue filters and page guidance.
export const processMenus:ProcessEntry[]=[
  process("draft","Draft pengajuan","01 · Pengajuan",["draft"],["call_center","verifier"],"Lengkapi draft dan foto wajib, lalu kirim pengajuan.","file"),
  process("screening","Screening awal","01 · Pengajuan",["screening"],["call_center"],"Periksa data awal. Loloskan screening, minta kelengkapan, atau catat penolakan."),
  process("perlu-dilengkapi","Perlu dilengkapi","01 · Pengajuan",["needs_data"],["call_center","verifier"],"Baca alasan pengembalian, lengkapi data, lalu kirim ulang.","file"),
  process("review-tahap-1","Persetujuan tahap 1","02 · Persetujuan",["review1"],["approver","chair"],"Tinjau pengajuan call center atau hasil screening. Setujui sebelum penugasan verifikator.","check"),
  process("review-langsung","Persetujuan langsung","02 · Persetujuan",["bypass_review"],["approver","chair"],"Tinjau pengajuan jalur langsung dan tetapkan keputusan serta nominal.","check"),
  process("penugasan-survei","Tugaskan verifikator","03 · Survei",["survey_assignment"],["call_center"],"Pilih verifikator yang akan melakukan kunjungan sesuai wilayah.","users"),
  process("survei","Survei berjalan","03 · Survei",["survey_assigned"],["call_center","verifier"],"Isi hasil kunjungan, koreksi data bila perlu, dan lengkapi foto survei.","clipboard","survey"),
  process("review-tahap-2","Persetujuan hasil survei","03 · Survei",["survey_submitted"],["approver","chair"],"Periksa hasil survei dan tetapkan nominal, tolak, atau minta survei ulang.","check"),
  process("review-ulang","Tinjau ulang nominal","03 · Survei",["review2"],["approver","chair"],"Tinjau alasan pengembalian atau penolakan dana, lalu tetapkan keputusan baru.","check"),
  process("penugasan-penyalur","Tentukan penyalur","04 · Dana bantuan",["approved"],["call_center"],"Pilih petugas penyalur agar bantuan dapat diajukan dananya.","users"),
  process("dana-siap","Perlu diajukan dananya","04 · Dana bantuan",["fund_ready"],["fund_requester"],"Ajukan di web dana terpisah, lalu tandai Dana diajukan di detail pengajuan.","wallet"),
  process("dana-diajukan","Menunggu keputusan dana","04 · Dana bantuan",["fund_submitted"],["fund_requester"],"Setelah ada keputusan di web dana, tandai Dana disetujui atau Dana ditolak di sini.","clock"),
  process("pencairan","Siap dicairkan","05 · Pencairan & penyerahan",["fund_approved"],["treasurer","fund_requester"],"Bendahara melakukan transfer manual, unggah bukti, lalu catat pencairan.","wallet"),
  process("penyaluran","Siap diserahkan","05 · Pencairan & penyerahan",["disbursed"],["verifier","treasurer","call_center"],"Penyalur menyerahkan bantuan, unggah foto dan sertifikat, lalu laporkan penyerahan.","hand","distribution"),
  process("gagal-salur","Gagal disalurkan","05 · Pencairan & penyerahan",["delivery_failed"],["verifier","treasurer","call_center"],"Periksa alasan gagal salur dan koordinasikan pengembalian dana ke Bendahara.","history","distribution"),
  process("selesai","Bantuan selesai","06 · Arsip",["completed"],["call_center","approver","chair","verifier","fund_requester","treasurer"],"Bantuan sudah diserahkan dan bukti lengkap. Buka detail untuk melihat hasilnya.","check"),
  process("ditolak","Pengajuan ditolak","06 · Arsip",["rejected_screening","rejected_t1","rejected_t2","rejected_bypass"],["call_center","approver","chair","verifier"],"Lihat alasan penolakan dan riwayat keputusan.","history"),
  process("dibatalkan","Pengajuan dibatalkan","06 · Arsip",["cancelled"],["call_center","approver","chair","verifier"],"Lihat pengajuan yang dibatalkan beserta alasan dan jejak prosesnya.","history"),
  process("dana-kembali","Dana dikembalikan","06 · Arsip",["returned"],["treasurer","fund_requester","approver","chair","verifier"],"Dana telah dikembalikan. Bukti dan pencatatan dapat dilihat di detail.","wallet"),
];
export function navigation(viewer:Pick<BantuanViewer,"role"|"canBypass">):NavEntry[]{
  if(!Object.prototype.hasOwnProperty.call(homeByRole,viewer.role))return [];
  if(viewer.role==="volunteer")return [{key:"santunan",label:"Santunan saya",icon:"hand",group:"Umum"}];
  const items:NavEntry[]=[
    {key:"",label:"Dashboard",icon:"layout",group:"Umum"},
    {key:"pengajuan",label:"Semua pengajuan",icon:"files",group:"Umum"},
    {key:"proses",label:"Proses bantuan",icon:"inbox",group:"Umum"},
  ];
  if(["admin","call_center"].includes(viewer.role))items.push({key:"pengajuan/baru",label:"Pengajuan baru",icon:"plus",group:"01 · Pengajuan"});
  if(viewer.canBypass&&["admin","call_center","verifier"].includes(viewer.role))items.push({key:"pengajuan/langsung",label:"Pengajuan langsung",icon:"plus",group:"01 · Pengajuan"});
  items.push(...processMenus.filter(item=>viewer.role==="admin"||item.roles.includes(viewer.role)));
  if(["admin","treasurer","chair"].includes(viewer.role))items.push({key:"santunan",label:"Santunan",icon:"hand",group:"Umum"});
  items.push({key:"laporan",label:"Laporan penyaluran",icon:"chart",group:"Laporan"});
  if(viewer.role==="admin")items.push(
    {key:"tim",label:"Tim & akses",icon:"users",group:"Pengelolaan"},
    {key:"pengaturan",label:"Master data",icon:"settings",group:"Pengelolaan"});
  if(["admin","chair"].includes(viewer.role))items.push({key:"audit",label:"Audit aktivitas",icon:"shield",group:"Pengelolaan"});
  return items;
}
export function sidebarNavigation(viewer:Pick<BantuanViewer,"role"|"canBypass">):NavEntry[]{
  if(viewer.role==="volunteer")return navigation(viewer);
  return navigation(viewer).filter(item=>["","pengajuan","proses","laporan","tim","pengaturan","audit"].includes(item.key));
}
export function processInfo(view:string):NavEntry|undefined {
  if(view==="review")return {key:view,label:"Antrean persetujuan",icon:"check",group:"02 · Persetujuan",states:["review1","survey_submitted","review2","bypass_review"],description:"Pilih pengajuan untuk meninjau dan mencatat keputusan."};
  if(view==="dana")return {key:view,label:"Pengajuan dana",icon:"wallet",group:"04 · Dana bantuan",states:["fund_ready","fund_submitted"],description:"Ajukan dana di web terpisah lalu perbarui statusnya di sini. Gunakan menu per tahap untuk antrean yang lebih spesifik."};
  return processMenus.find(item=>item.key===view);
}
export function defaultListStates(_viewer:Pick<BantuanViewer,"role">,view:string):string[]{
  return processInfo(view)?.states??[];
}
export function canViewRoute(viewer:Pick<BantuanViewer,"role"|"canBypass">,route:string[]):boolean{
  if(viewer.role==="volunteer")return route.length===1&&route[0]==="santunan";
  if(!route.length)return true;
  if(route[0]==="pengajuan"&&route[1]){
    if(route[1]==="baru")return route.length===2&&["admin","call_center"].includes(viewer.role);
    if(route[1]==="langsung")return route.length===2&&viewer.canBypass&&["admin","call_center","verifier"].includes(viewer.role);
    if(route.length>3||route[2]&&route[2]!=="edit")return false;
    return route[2]!=="edit"||["admin","call_center","verifier"].includes(viewer.role);
  }
  if(route.length!==1)return false;
  if(route[0]==="review")return ["admin","approver","chair"].includes(viewer.role);
  if(route[0]==="dana")return ["admin","fund_requester"].includes(viewer.role);
  return navigation(viewer).some(item=>item.key===route[0]);
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
