import "server-only";
import { prisma } from "@/lib/prisma";
import { TanwirError } from "./errors";
import { deleteUpload, readUpload, saveUpload } from "./files";
import {
  MAX_SUBMISSION_BYTES,
  QUIZ_OPTIONS,
  canSubmit,
  fileMatchesTask,
  isLateSubmission,
  isTaskLocked,
  quizScore,
  studentTaskState,
  type QuizOption,
  type SubmissionStatus,
} from "./policy";

// ───────────────────────── Peserta ─────────────────────────

/** §6.9 — peserta hanya melihat tugas yang terkirim ke kelompoknya. */
export async function listStudentTasks(member: { id: string; groupId: string | null }) {
  if (!member.groupId) return [];
  const tasks = await prisma.tanwirTask.findMany({
    where: { groups: { some: { groupId: member.groupId } } },
    orderBy: { deadline: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      deadline: true,
      teacher: { select: { user: { select: { name: true } } } },
      submissions: { where: { studentId: member.id }, select: { status: true, score: true, isLate: true, attemptsCount: true } },
    },
  });
  const now = new Date();
  return tasks.map(({ submissions, ...task }) => {
    const submission = submissions[0] ?? null;
    const locked = isTaskLocked(task.deadline, now);
    const state = studentTaskState(submission?.status ?? null, locked);
    // Tenggat < 24 jam untuk tugas yang masih harus dikerjakan — disorot merah di daftar.
    const dueSoon = (state === "todo" || state === "rejected") && task.deadline.getTime() - now.getTime() < 86_400_000;
    return { ...task, submission, locked, state, dueSoon };
  });
}

async function visibleTask(taskId: string, member: { id: string; groupId: string | null }) {
  if (!member.groupId) return null;
  return prisma.tanwirTask.findFirst({
    where: { id: taskId, groups: { some: { groupId: member.groupId } } },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      deadline: true,
      originalDeadline: true,
      teacher: { select: { user: { select: { name: true } } } },
    },
  });
}

export async function getStudentTaskDetail(taskId: string, member: { id: string; groupId: string | null }) {
  const task = await visibleTask(taskId, member);
  if (!task) return null;
  const submission = await prisma.tanwirSubmission.findUnique({
    where: { taskId_studentId: { taskId, studentId: member.id } },
    select: {
      id: true,
      status: true,
      score: true,
      isLate: true,
      attemptsCount: true,
      submittedAt: true,
      fileMime: true,
      logs: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, feedback: true, attemptNumber: true, createdAt: true, reviewer: { select: { user: { select: { name: true } } } } },
      },
      answers: { select: { questionId: true, selectedOption: true, isCorrect: true } },
    },
  });
  const locked = isTaskLocked(task.deadline);
  // Kunci jawaban baru dikirim ke peserta SETELAH kuis dikumpulkan — sebelum itu hanya soal & pilihan.
  const questions =
    task.type === "quiz"
      ? await prisma.tanwirQuizQuestion.findMany({
          where: { taskId },
          orderBy: { order: "asc" },
          select: {
            id: true,
            question: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            correctOption: !!submission,
          },
        })
      : [];
  return {
    task,
    submission,
    questions,
    locked,
    canSubmit: canSubmit(submission?.status ?? null, locked, task.type),
    state: studentTaskState(submission?.status ?? null, locked),
  };
}

async function loadForSubmit(taskId: string, member: { id: string; groupId: string | null }) {
  const task = await visibleTask(taskId, member);
  if (!task) throw new TanwirError("Tugas tidak ditemukan.");
  const existing = await prisma.tanwirSubmission.findUnique({
    where: { taskId_studentId: { taskId, studentId: member.id } },
    select: { id: true, status: true, attemptsCount: true, filePath: true },
  });
  if (!canSubmit(existing?.status ?? null, isTaskLocked(task.deadline), task.type)) {
    if (isTaskLocked(task.deadline)) throw new TanwirError("Tenggat sudah lewat. Minta guru memperpanjang tenggat.");
    throw new TanwirError("Tugas ini sudah dikumpulkan.");
  }
  return { task, existing };
}

/** §6.5–6.6 — setoran voice note/video. Kirim ulang setelah ditolak menaikkan nomor percobaan. */
export async function submitMedia(taskId: string, member: { id: string; groupId: string | null }, file: File) {
  const { task, existing } = await loadForSubmit(taskId, member);
  if (task.type === "quiz") throw new TanwirError("Kuis dikerjakan langsung di halaman tugas.");
  const { bytes, detected } = await readUpload(file, MAX_SUBMISSION_BYTES);
  if (!fileMatchesTask(detected, task.type)) {
    throw new TanwirError(task.type === "video" ? "File harus berupa video (MP4, WEBM, atau MOV)." : "File harus berupa audio (MP3, WAV, OGG, M4A, atau WEBM).");
  }
  const filePath = await saveUpload(`submissions/${task.id}/${member.id}`, bytes, detected.ext);
  const isLate = isLateSubmission(task.originalDeadline);
  try {
    if (existing) {
      // Hanya baris yang masih berstatus ditolak yang boleh diperbarui (cegah kirim ganda bersamaan).
      const updated = await prisma.tanwirSubmission.updateMany({
        where: { id: existing.id, status: "rejected" },
        data: { filePath, fileMime: detected.mime, status: "pending", attemptsCount: existing.attemptsCount + 1, isLate, submittedAt: new Date() },
      });
      if (updated.count === 0) throw new TanwirError("Tugas ini sudah dikumpulkan.");
      await deleteUpload(existing.filePath);
    } else {
      await prisma.tanwirSubmission.create({
        data: { taskId: task.id, studentId: member.id, filePath, fileMime: detected.mime, status: "pending", attemptsCount: 1, isLate },
      });
    }
  } catch (error) {
    await deleteUpload(filePath);
    if (error instanceof TanwirError) throw error;
    throw new TanwirError("Tugas ini sudah dikumpulkan.");
  }
  return { isLate };
}

/** §6.8 — kuis sekali kerja, semua soal wajib, langsung disetujui dengan nilai otomatis. */
export async function submitQuiz(taskId: string, member: { id: string; groupId: string | null }, answers: Record<string, string>) {
  const { task } = await loadForSubmit(taskId, member);
  if (task.type !== "quiz") throw new TanwirError("Tugas ini bukan kuis.");
  const questions = await prisma.tanwirQuizQuestion.findMany({ where: { taskId }, select: { id: true, correctOption: true } });
  if (!questions.length) throw new TanwirError("Kuis belum punya soal.");
  const graded = questions.map((question) => {
    const selected = answers[question.id] as QuizOption | undefined;
    if (!selected || !QUIZ_OPTIONS.includes(selected)) throw new TanwirError("Semua soal wajib dijawab.");
    return { questionId: question.id, selectedOption: selected, isCorrect: selected === question.correctOption };
  });
  const correct = graded.filter((answer) => answer.isCorrect).length;
  const score = quizScore(correct, graded.length);
  const isLate = isLateSubmission(task.originalDeadline);
  try {
    await prisma.tanwirSubmission.create({
      data: { taskId, studentId: member.id, status: "approved", attemptsCount: 1, score, isLate, answers: { create: graded } },
    });
  } catch {
    throw new TanwirError("Kuis ini sudah dikerjakan.");
  }
  return { score, correct, total: graded.length, isLate };
}

// ───────────────────────── Guru ─────────────────────────

/** §6.7 — antrean koreksi: setoran menunggu dari tugas buatan guru ini (kuis tidak pernah masuk). */
export async function listReviewQueue(teacherId: string) {
  return prisma.tanwirSubmission.findMany({
    where: { status: "pending", task: { teacherId, type: { not: "quiz" } } },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      attemptsCount: true,
      isLate: true,
      submittedAt: true,
      task: { select: { id: true, title: true, type: true } },
      student: { select: { code: true, user: { select: { name: true } } } },
    },
  });
}

export async function getSubmissionForReview(submissionId: string, teacherId: string) {
  return prisma.tanwirSubmission.findFirst({
    where: { id: submissionId, task: { teacherId } },
    select: {
      id: true,
      status: true,
      attemptsCount: true,
      isLate: true,
      submittedAt: true,
      fileMime: true,
      filePath: true,
      score: true,
      task: { select: { id: true, title: true, type: true, description: true } },
      student: { select: { code: true, teachingPlace: true, group: { select: { name: true } }, user: { select: { name: true } } } },
      logs: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, feedback: true, attemptNumber: true, createdAt: true, reviewer: { select: { user: { select: { name: true } } } } },
      },
      answers: { select: { questionId: true, selectedOption: true, isCorrect: true, question: { select: { id: true, question: true, order: true, optionA: true, optionB: true, optionC: true, optionD: true, correctOption: true } } } },
    },
  });
}

export async function reviewSubmission(submissionId: string, reviewerId: string, decision: "approved" | "rejected", feedback: string) {
  const note = feedback.trim();
  if (decision === "rejected" && !note) throw new TanwirError("Alasan penolakan wajib diisi.");
  if (note.length > 5000) throw new TanwirError("Catatan terlalu panjang.");
  const submission = await prisma.tanwirSubmission.findFirst({
    where: { id: submissionId, task: { teacherId: reviewerId, type: { not: "quiz" } } },
    select: { id: true, attemptsCount: true },
  });
  if (!submission) throw new TanwirError("Setoran tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.tanwirSubmission.updateMany({ where: { id: submission.id, status: "pending" }, data: { status: decision } });
    if (updated.count === 0) throw new TanwirError("Setoran ini sudah dikoreksi.");
    await tx.tanwirSubmissionLog.create({
      data: {
        submissionId: submission.id,
        reviewerId,
        status: decision,
        feedback: decision === "approved" ? note || "Tugas disetujui." : note,
        attemptNumber: submission.attemptsCount,
      },
    });
  });
}

export async function listTaskResults(taskId: string) {
  return prisma.tanwirSubmission.findMany({
    where: { taskId },
    orderBy: [{ score: "desc" }, { submittedAt: "desc" }],
    select: {
      id: true,
      status: true,
      attemptsCount: true,
      isLate: true,
      score: true,
      submittedAt: true,
      student: { select: { code: true, user: { select: { name: true } } } },
      _count: { select: { answers: { where: { isCorrect: true } } } },
      answers: { select: { id: true } },
    },
  });
}

// ───────────────────────── File ─────────────────────────

/** §6.11 — file setoran hanya untuk peserta pemilik, guru pembuat tugas, dan admin Tanwir. */
export async function authorizeSubmissionFile(
  submissionId: string,
  viewer: { isAdmin: boolean; member: { id: string } | null },
) {
  const submission = await prisma.tanwirSubmission.findUnique({
    where: { id: submissionId },
    select: { filePath: true, fileMime: true, studentId: true, task: { select: { teacherId: true } } },
  });
  if (!submission?.filePath || !submission.fileMime) return null;
  const memberId = viewer.member?.id;
  const allowed = viewer.isAdmin || (memberId && (memberId === submission.studentId || memberId === submission.task.teacherId));
  return allowed ? { filePath: submission.filePath, mime: submission.fileMime } : null;
}

export function statusCounts(states: { state: string }[]) {
  const count = (state: string) => states.filter((item) => item.state === state).length;
  return { todo: count("todo"), pending: count("pending"), rejected: count("rejected"), approved: count("approved"), locked: count("locked") };
}

export type { SubmissionStatus };
