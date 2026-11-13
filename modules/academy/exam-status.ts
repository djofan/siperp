export type ExamStatusInput = {
  isPublished?: boolean; isActive: boolean;
  quizDate: Date | string | null; closesAt: Date | string | null;
};
export function examStatus(exam: ExamStatusInput, now = new Date()) {
  if (exam.isPublished === false) return { label: "Draft", tone: "bg-gray-100 text-gray-700" };
  if (!exam.isActive) return { label: "Nonaktif", tone: "bg-gray-100 text-gray-700" };
  if (exam.closesAt && new Date(exam.closesAt).getTime() <= now.getTime()) return { label: "Selesai", tone: "bg-slate-100 text-slate-700" };
  if (exam.quizDate && new Date(exam.quizDate).getTime() > now.getTime()) return { label: "Akan datang", tone: "bg-amber-50 text-amber-800" };
  if (!exam.quizDate && !exam.closesAt) return { label: "Belum dijadwalkan", tone: "bg-amber-50 text-amber-800" };
  return { label: "Sedang berlangsung", tone: "bg-green-50 text-green-700" };
}
