export interface FundingCandidate {
  id: string; number: string; name: string; program: string; region: string;
  problem?: string; needs?: string; distributorName?: string;
  amount: number; version: number; status: string;
}
export interface FundingBatch {
  id: string; number: string; title: string; notes: string | null;
  status: "submitted" | "approved" | "rejected"; totalAmount: number; version: number;
  createdBy: string; createdAt: string; decidedBy: string | null; decidedAt: string | null; reason: string | null;
  items: (FundingCandidate & { submittedVersion: number; decisionVersion: number | null; distributorName: string; currentAmount: number | null })[];
}
export interface FundingPage<T> {
  data: T[]; current_page: number; last_page: number;
  summary: { count: number; totalAmount: number };
}

export function fundingDescription(title: string, items: FundingCandidate[], notes = ""): string {
  const rupiah = (amount: number) => "Rp" + amount.toLocaleString("id-ID");
  const text = (value?: string) => value?.trim() || "Belum dicantumkan";
  return [
    title.trim() || "Pengajuan Dana Bantuan",
    "",
    `Mengajukan dana bantuan untuk ${items.length} penerima dengan rincian berikut:`,
    "",
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.name}`,
      `Nomor pengajuan: ${item.number}`,
      `Program: ${item.program}`,
      `Wilayah: ${text(item.region)}`,
      `Permasalahan: ${text(item.problem)}`,
      `Kebutuhan bantuan: ${text(item.needs)}`,
      `Nominal diajukan: ${rupiah(item.amount)}`,
      `Penyalur: ${item.distributorName?.trim() || "Belum ditetapkan"}`,
      "",
    ]),
    `Total penerima: ${items.length} orang`,
    `Total dana diajukan: ${rupiah(items.reduce((sum, item) => sum + item.amount, 0))}`,
    ...(notes.trim() ? ["", `Catatan: ${notes.trim()}`] : []),
  ].join("\n");
}
