import type { AidDashboard, BantuanViewer } from "@/contracts/modules/bantuan";
import type { NavEntry } from "./policy";

const tasks: Record<string, string[]> = {
  call_center: ["perlu-dilengkapi", "draft", "screening", "penugasan-survei", "penugasan-penyalur"],
  verifier: ["perlu-dilengkapi", "draft", "survei", "penyaluran"],
  approver: ["review-tahap-1", "review-langsung", "review-tahap-2", "review-ulang"],
  chair: ["review-tahap-1", "review-langsung", "review-tahap-2", "review-ulang"],
  fund_requester: ["dana-siap", "dana-diajukan"],
  treasurer: ["pencairan", "penyaluran", "gagal-salur"],
};
export function isWorkItem(role: string, item: NavEntry): boolean {
  return role === "admin" ? !item.group.includes("Arsip") : (tasks[role] ?? []).includes(item.key);
}
export function queueCount(viewer: BantuanViewer, dashboard: AidDashboard | null, item: NavEntry): number | null {
  if (!dashboard) return null;
  const counts = viewer.role === "verifier" && item.task ? dashboard.taskCounts?.[item.task] : dashboard.byStatus;
  return counts ? (item.states ?? []).reduce((sum, state) => sum + Number(counts[state] ?? 0), 0) : null;
}
export const taskCopy: Record<string, { title: string; action: string; description: string }> = {
  draft: { title:"Lanjutkan pengajuan yang belum dikirim", action:"Lengkapi draft", description:"Isian tersimpan sebagai draft. Lengkapi data dan foto, lalu kirim untuk diproses." },
  "perlu-dilengkapi": { title:"Lengkapi data yang dikembalikan", action:"Lengkapi data", description:"Baca catatan petugas, perbaiki data yang diminta, lalu kirim ulang." },
  screening: { title:"Periksa pengajuan awal", action:"Periksa data", description:"Tinjau pengajuan yang datang ke kantor. Pengajuan WhatsApp langsung masuk ke penyetuju." },
  "penugasan-survei": { title:"Pilih petugas survei", action:"Tugaskan petugas", description:"Pengajuan sudah disetujui. Pilih verifikator untuk mengunjungi pemohon." },
  survei: { title:"Isi hasil kunjungan survei", action:"Isi hasil survei", description:"Buka tugas Anda, catat kondisi pemohon, dan unggah foto hasil kunjungan." },
  "penugasan-penyalur": { title:"Pilih petugas penyalur", action:"Tentukan penyalur", description:"Nominal sudah ditetapkan. Pilih siapa yang akan menyerahkan bantuan." },
  "dana-siap": { title:"Ajukan kebutuhan dana", action:"Proses dana", description:"Ajukan dana di web pengajuan dana, lalu catat bahwa dana sudah diajukan di sini." },
  "dana-diajukan": { title:"Catat hasil persetujuan dana", action:"Perbarui hasil", description:"Setelah ada keputusan dari atasan di web dana, tandai disetujui atau ditolak." },
  pencairan: { title:"Catat dana yang sudah ditransfer", action:"Catat pencairan", description:"Lakukan transfer lebih dahulu, lalu catat tanggal, nominal, dan rekening tujuan." },
  penyaluran: { title:"Laporkan penyerahan bantuan", action:"Lengkapi penyerahan", description:"Serahkan bantuan kepada pemohon, lalu isi laporan serta foto penyerahan dan sertifikat." },
  "gagal-salur": { title:"Tindak lanjuti bantuan gagal salur", action:"Tinjau pengembalian", description:"Periksa alasan gagal salur dan catat pengembalian dana yang sudah dilakukan." },
};
export function roleSteps(role: string): string[] {
  if (role === "volunteer") return ["Buka santunan yang ditugaskan kepada Anda.", "Tunggu dana ditandai sudah ditransfer oleh Bendahara.", "Setelah diserahkan, isi laporan dan unggah dua foto bukti."];
  if (["call_center", "admin"].includes(role)) return ["Buat pengajuan dan isi data pemohon.", "Kirim ke penyetuju; draft belum masuk proses.", "Setelah disetujui, pilih petugas survei atau penyalur."];
  if (role === "verifier") return ["Buka tugas survei yang ditugaskan kepada Anda.", "Isi hasil kunjungan dan lengkapi foto survei.", "Jika ditunjuk menyalurkan, laporkan penyerahan bantuan."];
  if (role === "fund_requester") return ["Buka pengajuan yang siap diajukan dananya.", "Ajukan dana di web dana terpisah, lalu catat di sini.", "Perbarui hasilnya setelah mendapat keputusan atasan."];
  if (role === "treasurer") return ["Buka pengajuan yang dananya telah disetujui.", "Transfer dana, lalu catat pencairannya di sini.", "Pantau penyerahan atau pengembalian dana."];
  return ["Buka pengajuan yang menunggu persetujuan.", "Periksa data pemohon, dokumen, dan hasil survei.", "Setujui, minta perbaikan, atau tolak dengan alasan."];
}
