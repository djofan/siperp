import { canManageOwnPasswordInModule, rolesOf, type RoleViewer } from "./permissions";
import type { BantuanViewer } from "@/contracts/modules/bantuan";

export const homeByRole: Record<string, string> = {
  admin: "", requester: "", call_center: "", approver: "", chair: "", observer: "", survey_approver: "",
  verifier: "", volunteer:"santunan", fund_requester: "", treasurer: "",
};
export const href = (view = "") => `/admin/bantuan${view ? "/"+view : ""}`;
export const finalStates = ["completed","rejected_screening","rejected_t1","rejected_t2","rejected_bypass","cancelled","returned"];
export interface NavEntry {
  key:string; label:string; icon:string; group:string; states?:string[];
  description?:string; task?:"survey"|"distribution";
}
export const menuGroups = [
  {key:"menu-penerimaan",group:"01 · Pengajuan",label:"Penerimaan pengajuan",description:"Buat pengajuan, periksa data, dan lengkapi draft.",icon:"file"},
  {key:"menu-persetujuan",group:"02 · Persetujuan",label:"Persetujuan",description:"Tinjau dan putuskan kelanjutan pengajuan.",icon:"check"},
  {key:"menu-survei",group:"03 · Survei",label:"Survei & hasil kunjungan",description:"Penugasan verifikator, kunjungan, dan review hasil.",icon:"clipboard"},
  {key:"menu-dana",group:"04 · Dana bantuan",label:"Proses dana bantuan",description:"Tentukan penyalur dan pantau pengajuan dana.",icon:"wallet"},
  {key:"menu-penyaluran",group:"05 · Pencairan & penyerahan",label:"Pencairan & penyaluran",description:"Catat transfer, penyerahan, dan bukti bantuan.",icon:"hand"},
  {key:"menu-arsip",group:"06 · Arsip",label:"Arsip pengajuan",description:"Telusuri bantuan selesai dan pengajuan ditutup.",icon:"history"},
];
interface ProcessEntry extends NavEntry {roles:string[]}
const process=(key:string,label:string,group:string,states:string[],roles:string[],description:string,icon="inbox",task?:ProcessEntry["task"]):ProcessEntry=>({key,label,group,states,roles,description,icon,task});

// One source for menu visibility, server guards, queue filters and page guidance.
export const processMenus:ProcessEntry[]=[
  process("draft","Draft pengajuan","01 · Pengajuan",["draft"],["call_center","verifier","requester"],"Lengkapi draft dan foto wajib, lalu kirim pengajuan.","file"),
  process("screening","Review Call Center","01 · Pengajuan",["screening"],["call_center"],"Periksa pengajuan dari Petugas Pengajuan. Teruskan ke Approver, minta kelengkapan, atau catat penolakan."),
  process("perlu-dilengkapi","Perlu dilengkapi","01 · Pengajuan",["needs_data"],["call_center","verifier","requester"],"Baca alasan pengembalian, lengkapi data, lalu kirim ulang.","file"),
  process("review-tahap-1","Persetujuan tahap 1","02 · Persetujuan",["review1"],["approver","chair","survey_approver"],"Tinjau pengajuan call center atau hasil screening. Setujui sebelum penugasan verifikator.","check"),
  process("review-langsung","Persetujuan langsung","02 · Persetujuan",["bypass_review"],["approver","chair"],"Tinjau pengajuan jalur langsung dan tetapkan keputusan serta nominal.","check"),
  process("penugasan-survei","Tugaskan verifikator","03 · Survei",["survey_assignment"],["call_center"],"Pilih verifikator yang akan melakukan kunjungan sesuai wilayah.","users"),
  process("survei","Tugas survei saya","03 · Survei",["survey_assigned"],["verifier"],"Isi hasil kunjungan untuk pengajuan yang ditugaskan kepada Anda.","clipboard","survey"),
  process("monitor-survei","Monitor survei","03 · Survei",["survey_assigned"],["call_center"],"Pantau kunjungan petugas, kirim pengingat, atau ganti verifikator bila diperlukan.","clock"),
  process("review-tahap-2","Persetujuan hasil survei","03 · Survei",["survey_submitted"],["approver","chair"],"Periksa hasil survei dan tetapkan nominal, tolak, atau minta survei ulang.","check"),
  process("review-survei-cc","Periksa hasil survei","03 · Survei",["survey_cc_review"],["call_center"],"Periksa hasil kunjungan dan data pemohon. Koreksi isian sebelum meneruskannya ke Approver.","clipboard"),
  process("review-ulang","Tinjau ulang nominal","03 · Survei",["review2"],["approver","chair"],"Tinjau alasan pengembalian atau penolakan dana, lalu tetapkan keputusan baru.","check"),
  process("penugasan-penyalur","Tentukan penyalur","04 · Dana bantuan",["approved"],["call_center"],"Pilih petugas penyalur agar bantuan dapat diajukan dananya.","users"),
  process("dana-siap","Perlu diajukan dananya","04 · Dana bantuan",["fund_ready"],["fund_requester"],"Ajukan di web dana terpisah, lalu tandai Dana diajukan di detail pengajuan.","wallet"),
  process("dana-diajukan","Menunggu keputusan dana","04 · Dana bantuan",["fund_submitted"],["fund_requester"],"Setelah ada keputusan di web dana, tandai Dana disetujui atau Dana ditolak di sini.","clock"),
  process("pencairan","Siap dicairkan","05 · Pencairan & penyerahan",["fund_approved"],["treasurer","fund_requester"],"Bendahara melakukan transfer manual lalu catat pencairan. Bukti transfer dapat dilampirkan di form dan bersifat opsional.","wallet"),
  process("penyaluran","Siap diserahkan","05 · Pencairan & penyerahan",["disbursed"],["verifier","volunteer","treasurer","call_center"],"Penyalur menyerahkan bantuan, unggah foto dan sertifikat, lalu laporkan penyerahan.","hand","distribution"),
  process("gagal-salur","Gagal disalurkan","05 · Pencairan & penyerahan",["delivery_failed"],["verifier","volunteer","treasurer","call_center"],"Periksa alasan gagal salur dan koordinasikan pengembalian dana ke Bendahara.","history","distribution"),
  process("selesai","Bantuan selesai","06 · Arsip",["completed"],["call_center","approver","chair","verifier","fund_requester","treasurer"],"Bantuan sudah diserahkan dan bukti lengkap. Buka detail untuk melihat hasilnya.","check"),
  process("ditolak","Pengajuan ditolak","06 · Arsip",["rejected_screening","rejected_t1","rejected_t2","rejected_bypass"],["call_center","approver","chair","verifier"],"Lihat alasan penolakan dan riwayat keputusan.","history"),
  process("dibatalkan","Pengajuan dibatalkan","06 · Arsip",["cancelled"],["call_center","approver","chair","verifier"],"Lihat pengajuan yang dibatalkan beserta alasan dan jejak prosesnya.","history"),
  process("siap-disalurkan","Siap disalurkan","06 · Arsip",["disbursed"],["call_center","treasurer","fund_requester","approver","chair","verifier"],"Dana sudah diterima penyalur. Serahkan bantuan kepada penerima, lalu lengkapi laporan penyerahan.","hand"),
];
function singleNavigation(viewer:Pick<BantuanViewer,"role"|"canBypass">):NavEntry[]{
  if(!Object.prototype.hasOwnProperty.call(homeByRole,viewer.role))return [];
  if(viewer.role==="observer")return [
    {key:"",label:"Dashboard",icon:"layout",group:"Umum",description:"Ringkasan seluruh pengajuan bantuan."},
    {key:"berjalan",label:"Pengajuan Berjalan",icon:"inbox",group:"Umum",description:"Pantau seluruh pengajuan yang masih diproses."},
    {key:"pengajuan",label:"Semua pengajuan",icon:"files",group:"Umum",description:"Lihat semua pengajuan, dokumen, dan riwayat. Tambahkan catatan internal jika diperlukan."},
    {key:"mustahiq",label:"Data Mustahiq",icon:"users",group:"Umum",description:"Lihat profil dan riwayat bantuan tanpa mengubah data."},
    {key:"pengajuan-dana",label:"Pengajuan dana",icon:"wallet",group:"Umum",description:"Pantau kelompok pengajuan dana dan hasilnya."},
    ...processMenus.filter(item=>item.key!=="survei").map(item=>({...item,task:undefined,description:`Pantau ${item.label.toLowerCase()}. Akses baca saja.`})),
  ];
  if(viewer.role==="volunteer")return [{key:"proses",label:"Pekerjaan saya",icon:"inbox",group:"Umum"},{key:"penyaluran",label:"Siap diserahkan",icon:"hand",group:"Umum"},{key:"santunan",label:"Santunan saya",icon:"hand",group:"Umum"}];
  const items:NavEntry[]=[
    {key:"",label:"Dashboard",icon:"layout",group:"Umum"},
    {key:"pengajuan",label:viewer.role==="requester"?"Pengajuan saya":"Semua pengajuan",icon:"files",group:"Umum"},
    {key:"proses",label:"Pekerjaan saya",icon:"inbox",group:"Umum"},
  ];
  if(!["verifier","volunteer"].includes(viewer.role))items.push({key:"berjalan",label:"Pengajuan Berjalan",icon:"inbox",group:"Umum",description:viewer.role==="requester"?"Pantau pengajuan terkait Anda yang masih diproses.":"Pantau semua pengajuan yang masih diproses."});
  if(!["verifier","volunteer"].includes(viewer.role))items.push({key:"mustahiq",label:"Data Mustahiq",icon:"users",group:"Umum",description:"Profil penerima dan riwayat bantuan."});
  if(["admin","call_center","requester"].includes(viewer.role))items.push({key:"pengajuan/baru",label:"Pengajuan baru",icon:"plus",group:"01 · Pengajuan"});
  if(viewer.canBypass&&["admin","call_center","verifier"].includes(viewer.role))items.push({key:"pengajuan/langsung",label:"Pengajuan langsung",icon:"plus",group:"01 · Pengajuan"});
  items.push(...processMenus.filter(item=>viewer.role==="admin"||item.roles.includes(viewer.role)));
  if(["admin","treasurer","chair"].includes(viewer.role))items.push({key:"santunan",label:"Santunan",icon:"hand",group:"Umum"});
  if(["admin","fund_requester","treasurer","chair"].includes(viewer.role))items.push({key:"pengajuan-dana",label:"Pengajuan dana",icon:"wallet",group:"Umum",description:"Buat kartu pengajuan dana dari beberapa pemohon dan pantau total serta hasilnya."});
  items.push({key:"laporan",label:"Laporan penyaluran",icon:"chart",group:"Laporan"});
  if(viewer.role==="admin")items.push(
    {key:"tim",label:"Tim & akses",icon:"users",group:"Pengelolaan"},
    {key:"pengaturan",label:"Master data",icon:"settings",group:"Pengelolaan"});
  if(["admin","chair"].includes(viewer.role))items.push({key:"audit",label:"Audit aktivitas",icon:"shield",group:"Pengelolaan"});
  return items;
}
export function navigation(viewer:RoleViewer&Pick<BantuanViewer,"canBypass">):NavEntry[]{
  const items=rolesOf(viewer).flatMap(role=>singleNavigation({...viewer,role}));
  const canSeeAll=rolesOf(viewer).some(role=>!["requester","verifier","volunteer"].includes(role));
  return [...new Map(items.map(item=>[item.key,item])).values()].map(item=>item.key==="pengajuan"&&rolesOf(viewer).length>1?{...item,label:"Semua pengajuan"}:item.key==="berjalan"?{...item,description:canSeeAll?"Pantau semua pengajuan yang masih diproses.":"Pantau pengajuan terkait Anda yang masih diproses."}:item);
}
export function sidebarNavigation(viewer:RoleViewer&Pick<BantuanViewer,"canBypass">):NavEntry[]{
  // Keep general monitoring separate from the personal workspace of field staff.
  const primaryByRole:Record<string,string[]>={
    observer:["","berjalan","pengajuan","mustahiq","pengajuan-dana"],
    survey_approver:["","berjalan","pengajuan","proses","mustahiq"],
    admin:["","pengajuan","berjalan","proses","mustahiq","pengajuan-dana","laporan","santunan","tim","pengaturan","audit"],
    call_center:["","pengajuan","berjalan","proses","mustahiq","laporan"],
    requester:["","pengajuan","proses"],
    verifier:["","pengajuan","proses"],
    volunteer:["santunan","proses","penyaluran"],
    approver:["","pengajuan","berjalan","proses","mustahiq"],
    chair:["","pengajuan","berjalan","proses","mustahiq","pengajuan-dana","laporan","santunan","audit"],
    fund_requester:["","pengajuan","berjalan","proses","mustahiq","pengajuan-dana"],
    treasurer:["","pengajuan","berjalan","proses","mustahiq","pengajuan-dana","laporan","santunan"],
  };
  const main=rolesOf(viewer).flatMap(role=>primaryByRole[role]??[]);
  const priorities:Record<string,string[]>={
    call_center:["screening","penugasan-survei","review-survei-cc","penugasan-penyalur"], requester:["draft","perlu-dilengkapi"],
    verifier:["survei","penyaluran"],survey_approver:["review-tahap-1"],approver:["review-tahap-1","review-tahap-2"],chair:["review-tahap-1","review-tahap-2"],
    fund_requester:["dana-siap","dana-diajukan"],treasurer:["pencairan","penyaluran"],
  };
  const entries=navigation(viewer).filter(item=>main.includes(item.key)||rolesOf(viewer).some(role=>(priorities[role]??[]).includes(item.key)));
  const running=entries.findIndex(item=>item.key==="berjalan"),all=entries.findIndex(item=>item.key==="pengajuan");
  if(running>=0&&all>=0)[entries[running],entries[all]]=[entries[all],entries[running]];
  const personalOnly=rolesOf(viewer).every(role=>["requester","verifier","volunteer"].includes(role));
  return entries.map(item=>personalOnly&&item.key==="pengajuan"?{...item,label:"Pengajuan saya",description:"Pengajuan yang Anda buat atau ditugaskan kepada Anda."}:item);
}
export function processInfo(view:string):NavEntry|undefined {
  if(view==="review")return {key:view,label:"Antrean persetujuan",icon:"check",group:"02 · Persetujuan",states:["review1","survey_submitted","review2","bypass_review"],description:"Pilih pengajuan untuk meninjau dan mencatat keputusan."};
  if(view==="dana")return {key:view,label:"Pengajuan dana",icon:"wallet",group:"04 · Dana bantuan",states:["fund_ready","fund_submitted"],description:"Ajukan dana di web terpisah lalu perbarui statusnya di sini. Gunakan menu per tahap untuk antrean yang lebih spesifik."};
  return processMenus.find(item=>item.key===view);
}
export function defaultListStates(_viewer:Pick<BantuanViewer,"role">,view:string):string[]{
  return processInfo(view)?.states??[];
}
function canViewSingleRoute(viewer:Pick<BantuanViewer,"role"|"canBypass">,route:string[]):boolean{
  if(viewer.role==="volunteer")return route.length===1&&["santunan","proses","penyaluran"].includes(route[0])||route.length===2&&route[0]==="pengajuan"&&!["baru","langsung"].includes(route[1]);
  if(!route.length)return true;
  if(route[0]==="pengajuan"&&route[1]){
    if(route[1]==="baru")return route.length===2&&["admin","call_center","requester"].includes(viewer.role);
    if(route[1]==="langsung")return route.length===2&&viewer.canBypass&&["admin","call_center","verifier"].includes(viewer.role);
    if(route.length>3||route[2]&&route[2]!=="edit")return false;
    return route[2]!=="edit"||["admin","call_center","verifier","requester"].includes(viewer.role);
  }
  if(route.length!==1)return false;
  if(route[0]==="review")return ["admin","approver","chair"].includes(viewer.role);
  if(route[0]==="dana")return ["admin","fund_requester"].includes(viewer.role);
  return navigation(viewer).some(item=>item.key===route[0]);
}
export function canViewRoute(viewer:RoleViewer&Pick<BantuanViewer,"canBypass"|"canChooseModules">,route:string[]):boolean{
  if(route[0]==="akun")return route.length===1&&canManageOwnPasswordInModule(viewer);
  if(route[0]==="mustahiq")return route.length<=2&&rolesOf(viewer).some(role=>["admin","requester","call_center","approver","chair","treasurer","fund_requester","observer","survey_approver"].includes(role));
  const group=route.length===1?menuGroups.find(item=>item.key===route[0]):undefined;
  if(group)return navigation(viewer).some(item=>item.group===group.group);
  return rolesOf(viewer).some(role=>canViewSingleRoute({...viewer,role,roles:undefined} as BantuanViewer,route));
}
export function inboxStates(role:string):string[]{
  return ({admin:["screening","review1","survey_assignment","survey_cc_review","survey_submitted","bypass_review","approved","fund_ready","fund_submitted","fund_approved"],
    call_center:["draft","needs_data","screening","survey_assignment","survey_cc_review","approved"], requester:["draft","needs_data"],
    survey_approver:["review1"],approver:["review1","survey_submitted","review2","bypass_review"],chair:["review1","survey_submitted","review2","bypass_review"],
    verifier:["survey_assigned","disbursed"],fund_requester:["fund_ready","fund_submitted"],treasurer:["fund_approved","disbursed","delivery_failed"]} as Record<string,string[]>)[role]??[];
}
export function intakeStage(source:string, intakeRole?:string|null):string {
  if(source==="bypass")return "bypass_review";
  if(intakeRole==="requester")return "review1";
  if(["admin","call_center"].includes(intakeRole??""))return "review1";
  return source==="online"?"review1":"screening";
}
export function nextStep(status:string, source="online", intakeRole?:string|null, intakeType?:string): { title:string; description:string; owner:string } {
  if(intakeType==="other"){
    const custom:Record<string,[string,string,string]>={
      draft:["Lengkapi pengajuan lainnya","Isi data pelapor, masalah, dan detail kebutuhan. Lampiran awal opsional.","Pembuat pengajuan"],
      review2:["Periksa kebutuhan dan tetapkan nominal","Data sudah diperiksa Call Center. Tentukan nominal tanpa tahap survei.","Approver / Ketua Yayasan"],
      fund_approved:["Catat transfer kepada penyalur","Isi bank, rekening, nama penerima, hubungan, nominal, tanggal, dan bukti transfer.","Bendahara LAZSIP"],
      completed:["Laporan penyerahan tersimpan","Bantuan telah diserahkan dan laporan tercatat.","Selesai"],
    };
    if(custom[status]){const [title,description,owner]=custom[status];return {title,description,owner};}
  }
  const values:Record<string,[string,string,string]>={
    draft:["Lengkapi lalu kirim pengajuan",intakeRole==="requester"?"Lengkapi data lalu kirim ke Call Center untuk diperiksa sebelum diteruskan ke Approver.":source==="online"?"Draft belum masuk proses. Lengkapi data; foto WhatsApp opsional, lalu kirim ke penyetuju.":"Draft belum masuk proses. Lengkapi data, foto wajah dan KTP, lalu kirim pengajuan.","Pembuat pengajuan"],
    needs_data:["Lengkapi data yang diminta","Baca alasan pengembalian, perbarui data, lalu kirim kembali.",intakeRole==="requester"?"Petugas Pengajuan / Call Center":"Call Center"],
    screening:["Menunggu review Call Center","Call Center memeriksa data dan kelengkapan sebelum meneruskan ke Approver.","Call Center"],
    review1:["Menunggu keputusan tahap 1","Penyetuju akan menentukan apakah pengajuan dilanjutkan ke survei.","Penyetuju Survei / Approver / Ketua Yayasan"],
    survey_assignment:["Tentukan petugas survei","Pilih Verifikator sesuai wilayah agar kunjungan dapat dimulai.","Call Center"],
    survey_assigned:["Lakukan survei lapangan","Periksa data pemohon, isi hasil kunjungan, dan lengkapi slot foto.","Verifikator yang ditugaskan"],
    survey_cc_review:["Review hasil survei","Call Center memeriksa hasil kunjungan dan mengoreksi data sebelum mengirim ke Approver.","Call Center"],
    survey_submitted:["Menunggu keputusan nominal","Hasil survei sudah terkirim. Penyetuju meninjau dan menetapkan nominal.","Approver / Ketua Yayasan"],
    review2:["Tinjau ulang pengajuan","Periksa catatan pengembalian dana sebelum menetapkan nominal kembali.","Approver / Ketua Yayasan"],
    bypass_review:["Menunggu keputusan langsung","Pengajuan langsung tidak melewati screening dan survei. Penyetuju menetapkan keputusan.","Approver / Ketua Yayasan"],
    approved:["Tentukan penyalur bantuan",source==="bypass"?"Pilih Verifikator penyalur atau Bendahara langsung.":"Pilih Verifikator yang akan menyerahkan bantuan.","Call Center"],
    fund_ready:["Buat kartu pengajuan dana","Buka Pengajuan dana, centang bantuan yang ingin digabung, lalu buat kartu dengan total nominal otomatis.","Pengaju Dana"],
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
