import "server-only";
import { prisma } from "@/lib/prisma";
import { TanwirError } from "./errors";
import { deleteUpload } from "./files";
import { syncTeacherTaskGroups } from "./groups";
import { QUIZ_OPTIONS, extendedDeadline, isTaskLocked, type QuizOption, type TaskType } from "./policy";

const TASK_TYPES: readonly TaskType[] = ["voice_note", "video", "quiz"];

export interface QuestionInput {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correctOption: QuizOption;
}

/** "2026-10-08T14:00" dari input datetime-local diartikan sebagai WIB. */
export function parseWibDateTime(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function questionsInput(raw: FormDataEntryValue | null): QuestionInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof raw === "string" ? raw : "[]");
  } catch {
    throw new TanwirError("Data soal tidak valid.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new TanwirError("Kuis minimal punya satu soal.");
  if (parsed.length > 100) throw new TanwirError("Maksimal 100 soal per kuis.");
  return parsed.map((item, index) => {
    const row = item as Record<string, unknown>;
    const field = (key: string) => (typeof row[key] === "string" ? (row[key] as string).trim() : "");
    const label = `Soal ${index + 1}`;
    const question: QuestionInput = {
      question: field("question"),
      optionA: field("optionA"),
      optionB: field("optionB"),
      optionC: field("optionC") || null,
      optionD: field("optionD") || null,
      correctOption: field("correctOption") as QuizOption,
    };
    if (!question.question) throw new TanwirError(`${label}: pertanyaan wajib diisi.`);
    if (!question.optionA || !question.optionB) throw new TanwirError(`${label}: pilihan A dan B wajib diisi.`);
    if (question.optionD && !question.optionC) throw new TanwirError(`${label}: isi pilihan C sebelum D.`);
    if (!QUIZ_OPTIONS.includes(question.correctOption)) throw new TanwirError(`${label}: pilih kunci jawaban.`);
    const filled = { a: question.optionA, b: question.optionB, c: question.optionC, d: question.optionD };
    if (!filled[question.correctOption]) throw new TanwirError(`${label}: kunci jawaban harus pilihan yang terisi.`);
    return question;
  });
}

function taskInput(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const type = String(form.get("type") ?? "") as TaskType;
  const deadline = parseWibDateTime(String(form.get("deadline") ?? ""));
  if (!title) throw new TanwirError("Judul tugas wajib diisi.");
  if (title.length > 191 || description.length > 10000) throw new TanwirError("Isian terlalu panjang.");
  if (!description) throw new TanwirError("Deskripsi/perintah wajib diisi.");
  if (!TASK_TYPES.includes(type)) throw new TanwirError("Tipe tugas tidak valid.");
  if (!deadline) throw new TanwirError("Tenggat wajib diisi.");
  return { title, description, type, deadline };
}

async function ownTask(taskId: string, teacherId: string) {
  const task = await prisma.tanwirTask.findFirst({
    where: { id: taskId, teacherId },
    select: { id: true, type: true, deadline: true, originalDeadline: true, _count: { select: { submissions: true } } },
  });
  if (!task) throw new TanwirError("Tugas tidak ditemukan.");
  return task;
}

export async function createTask(teacherId: string, form: FormData) {
  const input = taskInput(form);
  if (input.deadline.getTime() <= Date.now()) throw new TanwirError("Tenggat harus setelah waktu sekarang.");
  const questions = input.type === "quiz" ? questionsInput(form.get("questions")) : [];
  return prisma.$transaction(async (tx) => {
    const task = await tx.tanwirTask.create({
      data: {
        ...input,
        teacherId,
        originalDeadline: input.deadline,
        questions: { create: questions.map((question, order) => ({ ...question, order })) },
      },
      select: { id: true },
    });
    const groups = await tx.tanwirGroup.findMany({ where: { picId: teacherId }, select: { id: true } });
    if (groups.length) await tx.tanwirTaskGroup.createMany({ data: groups.map((group) => ({ taskId: task.id, groupId: group.id })) });
    return task;
  });
}

export async function updateTask(taskId: string, teacherId: string, form: FormData) {
  const task = await ownTask(taskId, teacherId);
  const input = taskInput(form);
  const hasSubmissions = task._count.submissions > 0;
  if (hasSubmissions && input.type !== task.type) throw new TanwirError("Tipe tugas tidak bisa diubah setelah ada yang mengumpulkan.");
  const deadlineChanged = input.deadline.getTime() !== task.deadline.getTime();
  if (deadlineChanged && input.deadline.getTime() <= Date.now()) throw new TanwirError("Tenggat harus setelah waktu sekarang.");
  // Soal dikunci setelah ada pengumpulan supaya jawaban & nilai yang tersimpan tetap konsisten.
  const replaceQuestions = input.type === "quiz" && !hasSubmissions;
  const questions = replaceQuestions ? questionsInput(form.get("questions")) : [];

  await prisma.$transaction(async (tx) => {
    await tx.tanwirTask.update({
      where: { id: taskId },
      data: {
        ...input,
        // Selama belum ada pengumpulan, mengubah tenggat lewat form juga menggeser tenggat awal;
        // setelah ada pengumpulan, pakai "Perpanjang" agar penanda terlambat tetap adil.
        ...(deadlineChanged && !hasSubmissions ? { originalDeadline: input.deadline } : {}),
      },
    });
    if (input.type !== "quiz") await tx.tanwirQuizQuestion.deleteMany({ where: { taskId } });
    if (replaceQuestions) {
      await tx.tanwirQuizQuestion.deleteMany({ where: { taskId } });
      await tx.tanwirQuizQuestion.createMany({ data: questions.map((question, order) => ({ ...question, order, taskId })) });
    }
    await syncTeacherTaskGroups(teacherId, tx);
  });
}

export async function deleteTask(taskId: string, teacherId: string | null) {
  const task = await prisma.tanwirTask.findFirst({
    where: { id: taskId, ...(teacherId ? { teacherId } : {}) },
    select: { id: true, submissions: { select: { filePath: true } } },
  });
  if (!task) throw new TanwirError("Tugas tidak ditemukan.");
  await prisma.tanwirTask.delete({ where: { id: taskId } });
  await Promise.all(task.submissions.map((row) => deleteUpload(row.filePath)));
}

/** §6.3 — hanya pembuat, hanya saat terkunci. */
export async function extendTask(taskId: string, teacherId: string, hours: number) {
  const task = await ownTask(taskId, teacherId);
  if (!isTaskLocked(task.deadline)) throw new TanwirError("Tugas belum melewati tenggat.");
  let deadline: Date;
  try {
    deadline = extendedDeadline(hours);
  } catch (error) {
    throw new TanwirError(error instanceof Error ? error.message : "Jumlah jam tidak valid.");
  }
  await prisma.tanwirTask.update({ where: { id: taskId }, data: { deadline } });
}

export async function listTeacherTasks(teacherId: string) {
  return prisma.tanwirTask.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      deadline: true,
      originalDeadline: true,
      createdAt: true,
      groups: { select: { group: { select: { name: true } } } },
      _count: { select: { submissions: true, questions: true } },
      submissions: { where: { status: "pending" }, select: { id: true } },
    },
  });
}

export async function getTeacherTask(taskId: string, teacherId: string) {
  return prisma.tanwirTask.findFirst({
    where: { id: taskId, teacherId },
    include: {
      questions: { orderBy: { order: "asc" } },
      groups: { select: { group: { select: { id: true, name: true, _count: { select: { members: true } } } } } },
      _count: { select: { submissions: true } },
    },
  });
}

/** Admin: semua tugas lintas guru untuk monitor & pengingat WhatsApp. */
export async function listAllTasks() {
  return prisma.tanwirTask.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      deadline: true,
      createdAt: true,
      teacher: { select: { phone: true, code: true, user: { select: { name: true } } } },
      _count: { select: { submissions: true } },
      submissions: { where: { status: "pending" }, select: { id: true } },
    },
  });
}
