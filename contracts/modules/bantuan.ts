export const bantuanRoles: Record<string, string> = {
  admin: "Admin", call_center: "Call Center", approver: "Approver", verifier: "Verifikator",
  volunteer: "Relawan", fund_requester: "Pengaju Dana", treasurer: "Pengirim bantuan / Bendahara", chair: "Ketua Yayasan",
};
export const bantuanActionLabels: Record<string, string> = {
  create: "Pengajuan dibuat", edit_intake: "Data pengajuan diperbarui", submit: "Pengajuan dikirim",
  screen_pass: "Lolos screening", screen_reject: "Ditolak saat screening", request_data: "Diminta melengkapi data",
  review1_approve: "Disetujui untuk survei", review1_reject: "Ditolak pada review tahap 1",
  assign_survey: "Verifikator ditugaskan", survey_save: "Draft survei disimpan", survey_submit: "Survei dikirim",
  approve: "Nominal bantuan ditetapkan", review_reject: "Pengajuan ditolak", survey_again: "Diminta survei ulang",
  assign_distributor: "Penyalur ditetapkan", fund_submit: "Dana ditandai diajukan", fund_approve: "Dana ditandai disetujui",
  fund_reject: "Dana ditolak, kembali ke penyetuju", disburse: "Pencairan dicatat", handover: "Bantuan selesai diserahkan",
  delivery_fail: "Gagal disalurkan", return_funds: "Dana dikembalikan", reopen: "Pengajuan dibuka kembali",
  cancel: "Pengajuan dibatalkan", comment: "Komentar internal", upload_document: "Dokumen diunggah",
  read_document: "Dokumen dilihat", update_settings: "Pengaturan diperbarui", create_staff: "Anggota ditambahkan", update_staff: "Akses anggota diperbarui",
  delete_staff: "Akses anggota dicabut", switch_role: "Peran aktif diganti", export_summary: "Laporan diekspor",
};
export const bantuanStatuses: Record<string, string> = {
  draft: "Draft", screening: "Screening", needs_data: "Perlu dilengkapi", review1: "Review tahap 1",
  survey_assignment: "Menunggu Verifikator", survey_assigned: "Sedang survei", survey_submitted: "Review tahap 2",
  review2: "Review ulang nominal", bypass_review: "Keputusan langsung", approved: "Tentukan penyalur",
  fund_ready: "Perlu diajukan dananya", fund_submitted: "Dana diajukan", fund_approved: "Siap dicairkan",
  disbursed: "Dana di penyalur", completed: "Selesai", delivery_failed: "Gagal disalurkan", returned: "Dana dikembalikan",
  rejected_screening: "Ditolak screening", rejected_t1: "Ditolak tahap 1", rejected_t2: "Ditolak tahap 2",
  rejected_bypass: "Ditolak langsung", cancelled: "Dibatalkan",
};
export const documentLabels: Record<string, string> = {
  face: "Foto wajah", ktp: "Foto KTP", kk: "Foto KK", supporting: "Foto pendukung", survey_recipient: "Penerima saat survei", survey_front: "Tampak depan rumah",
  survey_inside: "Ruangan dalam (minimal 2)", survey_environment: "Rumah & lingkungan", survey_other: "Foto survei lainnya",
  sktm: "Foto SKTM", transfer: "Bukti transfer Bendahara", handover: "Foto penyerahan", certificate: "Foto sertifikat",
  receipt: "Bukti tunai / transfer penerima", return: "Bukti pengembalian dana",
};
export interface BantuanSettings { programs: string[]; regions: string[]; housing: string[]; minimumSurveyPhotos: number; distributionDays: number; closingText: string }
export interface BantuanViewer { id: string; name: string; role: string; roles?: string[]; canBypass: boolean; settings: BantuanSettings }
export interface BantuanStaff { id: string; name: string; code?: string; role: string; roles?: string[]; region?: string; active: boolean; email?: string; canBypass?: boolean; canManage?: boolean; canEditIdentity?: boolean; protectedAccount?: boolean; sharedAccount?: boolean }
export interface AidApplication {
  id: string; number: string; name: string; status: string; program: string; region: string; source: string; createdBy: string;
  amount: number | null; verifierId: string | null; distributorId: string | null; distributionType: string | null;
  version: number; createdAt: string; updatedAt: string; disbursedAt: string | null; completedAt: string | null;
}
export interface AidDependent { name:string; relationship:string; gender:string; age:number|""; status:string }
export type AidValues = Record<string, string | number | boolean | null | AidDependent[]>;
export interface AidApplicantHistory { id:string; number:string; program:string; status:string; amount:number|null; createdAt:string }
export interface AidDetail extends AidApplication {
  applicant: AidValues;
  survey: Record<string, unknown> | null; handover: Record<string, unknown> | null;
  bypassReason: string | null; fundReference: string | null; duplicateCount: number;
  duplicateApplications: AidApplicantHistory[];
  documents: { id: string; kind: string; mime: string; created_at: string; used_at?: string | null; caption?: string | null }[];
  events: { id: string; action: string; from_status: string | null; to_status: string; actor_role: string; actorName: string | null; reason: string | null; created_at: string }[];
}
export interface AidPage { data: AidApplication[]; current_page: number; last_page: number; total: number; per_page?:number; filterOptions?:{programs:string[];regions:string[]}; summary?:Pick<AidDashboard,"total"|"byStatus"|"approvedAmount"|"disbursedAmount"|"completedAmount"|"overdue">|null }
export interface AidDashboard {
  taskCounts?: { survey: Record<string, number>; distribution: Record<string, number> };
  total: number; byStatus: Record<string, number>; byProgram: Record<string, number>; bySource: Record<string, number>;
  approvedAmount: number; disbursedAmount: number; completedAmount: number; overdue: number;
  tickets: { distributor_id: string | null; distribution_type: string; total: number; amount: number }[];
}
export interface AidNotification { id: string; application_id: string; message: string; read_at: string | null; created_at: string }
export interface SantunanRecord {
  id: string; number: string; frequency: "routine"|"non_routine"; category: "widow"|"orphan"|"foster_child";
  period: string; recipientName: string; volunteerId: string; amount: number;
  transferStatus: "pending"|"transferred"; distributionStatus: "process"|"completed";
  transferredAt: string|null; completedAt: string|null; version: number;
  report: { distributionDate:string; location:string; recipient:string; description:string }|null;
  documents: { id:string; kind:"aid_paper"|"recipient_photo"|"transfer"; created_at:string }[];
}
