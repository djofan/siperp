export function participantExamStatus(exam: {
  isActive: boolean;
  quizDate: Date | null;
  closesAt: Date | null;
}, released: boolean, attempted: boolean, now = new Date()) {
  if (exam.closesAt && exam.closesAt <= now) return {
    available: false,
    message: attempted
      ? "Waktu ujian sudah berakhir. Anda tidak dapat melanjutkan pengerjaan ujian ini."
      : "Anda melewatkan ujian ini. Rentang waktu pengerjaan sudah berakhir dan Anda belum mengerjakan ujian ini.",
  };
  if (!exam.isActive) return { available: false, message: "Ujian sedang dinonaktifkan oleh admin." };
  if (!released || (exam.quizDate && exam.quizDate > now)) return { available: false, message: "Ujian belum dibuka. Silakan kembali sesuai jadwal yang ditentukan admin." };
  return { available: true, message: "" };
}
