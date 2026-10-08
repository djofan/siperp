import "server-only";
import { prisma } from "@/lib/prisma";
import { OjolError } from "./errors";
import { deleteUpload } from "./files";
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
    throw new OjolError("Data soal tidak valid.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new OjolError("Kuis minimal punya satu soal.");
  if (parsed.length > 100) throw new OjolError("Maksimal 100 soal per kuis.");
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
    if (!question.question) throw new OjolError(`${label}: pertanyaan wajib diisi.`);
    if (!question.optionA || !question.optionB) throw new OjolError(`${label}: pilihan A dan B wajib diisi.`);
    if (question.optionD && !question.optionC) throw new OjolError(`${label}: isi pilihan C sebelum D.`);
    if (!QUIZ_OPTIONS.includes(question.correctOption)) throw new OjolError(`${label}: pilih kunci jawaban.`);
    const filled = { a: question.optionA, b: question.optionB, c: question.optionC, d: question.optionD };
    if (!filled[question.correctOption]) throw new OjolError(`${label}: kunci jawaban harus pilihan yang terisi.`);
    return question;
  });
}

function taskInput(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const type = String(form.get("type") ?? "") as TaskType;
  const deadline = parseWibDateTime(String(form.get("deadline") ?? ""));
  if (!title) throw new OjolError("Judul tugas wajib diisi.");
  if (title.length > 191 || description.length > 10000) throw new OjolError("Isian terlalu panjang.");
  if (!description) throw new OjolError("Deskripsi/perintah wajib diisi.");
  if (!TASK_TYPES.includes(type)) throw new OjolError("Tipe tugas tidak valid.");
  if (!deadline) throw new OjolError("Tenggat wajib diisi.");
  return { title, description, type, deadline };
}

/**
 * prd-ojol §3: guru memilih kelompok penerima (minimal satu) dan boleh menunjuk guru lain
 * sebagai co-reviewer. Pembuat tugas tidak perlu ditunjuk ulang sebagai co-reviewer.
 */
async function recipientsInput(form: FormData, teacherId: string) {
  const unique = (values: FormDataEntryValue[]) => [...new Set(values.filter((v): v is string => typeof v === "string" && v !== ""))];
  const groupIds = unique(form.getAll("groupIds"));
  const approverIds = unique(form.getAll("approverIds")).filter((id) => id !== teacherId);
  if (!groupIds.length) throw new OjolError("Pilih minimal satu kelompok penerima.");
  const [groups, approvers] = await Promise.all([
    prisma.ojolGroup.count({ where: { id: { in: groupIds } } }),
    approverIds.length ? prisma.ojolMember.count({ where: { id: { in: approverIds }, role: "guru" } }) : Promise.resolve(0),
  ]);
  if (groups !== groupIds.length) throw new OjolError("Kelompok penerima tidak valid.");
  if (approvers !== approverIds.length) throw new OjolError("Co-reviewer harus guru yang terdaftar.");
  return { groupIds, approverIds };
}

async function ownTask(taskId: string, teacherId: string) {
  const task = await prisma.ojolTask.findFirst({
    where: { id: taskId, teacherId },
    select: { id: true, type: true, deadline: true, originalDeadline: true, _count: { select: { submissions: true } } },
  });
  if (!task) throw new OjolError("Tugas tidak ditemukan.");
  return task;
}

export async function createTask(teacherId: string, form: FormData) {
  const input = taskInput(form);
  if (input.deadline.getTime() <= Date.now()) throw new OjolError("Tenggat harus setelah waktu sekarang.");
  const questions = input.type === "quiz" ? questionsInput(form.get("questions")) : [];
  const { groupIds, approverIds } = await recipientsInput(form, teacherId);
  return prisma.$transaction(async (tx) => {
    const task = await tx.ojolTask.create({
      data: {
        ...input,
        teacherId,
        originalDeadline: input.deadline,
        questions: { create: questions.map((question, order) => ({ ...question, order })) },
        groups: { create: groupIds.map((groupId) => ({ groupId })) },
        approvers: { create: approverIds.map((approverId) => ({ teacherId: approverId })) },
      },
      select: { id: true },
    });
    return task;
  });
}

export async function updateTask(taskId: string, teacherId: string, form: FormData) {
  const task = await ownTask(taskId, teacherId);
  const input = taskInput(form);
  const hasSubmissions = task._count.submissions > 0;
  if (hasSubmissions && input.type !== task.type) throw new OjolError("Tipe tugas tidak bisa diubah setelah ada yang mengumpulkan.");
  const deadlineChanged = input.deadline.getTime() !== task.deadline.getTime();
  if (deadlineChanged && input.deadline.getTime() <= Date.now()) throw new OjolError("Tenggat harus setelah waktu sekarang.");
  // Soal dikunci setelah ada pengumpulan supaya jawaban & nilai yang tersimpan tetap konsisten.
  const replaceQuestions = input.type === "quiz" && !hasSubmissions;
  const questions = replaceQuestions ? questionsInput(form.get("questions")) : [];
  const { groupIds, approverIds } = await recipientsInput(form, teacherId);

  await prisma.$transaction(async (tx) => {
    await tx.ojolTask.update({
      where: { id: taskId },
      data: {
        ...input,
        // Selama belum ada pengumpulan, mengubah tenggat lewat form juga menggeser tenggat awal;
        // setelah ada pengumpulan, pakai "Perpanjang" agar penanda terlambat tetap adil.
        ...(deadlineChanged && !hasSubmissions ? { originalDeadline: input.deadline } : {}),
      },
    });
    if (input.type !== "quiz") await tx.ojolQuizQuestion.deleteMany({ where: { taskId } });
    if (replaceQuestions) {
      await tx.ojolQuizQuestion.deleteMany({ where: { taskId } });
      await tx.ojolQuizQuestion.createMany({ data: questions.map((question, order) => ({ ...question, order, taskId })) });
    }
    await tx.ojolTaskGroup.deleteMany({ where: { taskId } });
    await tx.ojolTaskGroup.createMany({ data: groupIds.map((groupId) => ({ taskId, groupId })) });
    await tx.ojolTaskApprover.deleteMany({ where: { taskId } });
    if (approverIds.length) await tx.ojolTaskApprover.createMany({ data: approverIds.map((approverId) => ({ taskId, teacherId: approverId })) });
  });
}

export async function deleteTask(taskId: string, teacherId: string | null) {
  const task = await prisma.ojolTask.findFirst({
    where: { id: taskId, ...(teacherId ? { teacherId } : {}) },
    select: { id: true, submissions: { select: { filePath: true } } },
  });
  if (!task) throw new OjolError("Tugas tidak ditemukan.");
  await prisma.ojolTask.delete({ where: { id: taskId } });
  await Promise.all(task.submissions.map((row) => deleteUpload(row.filePath)));
}

/** §6.3 — hanya pembuat, hanya saat terkunci. */
export async function extendTask(taskId: string, teacherId: string, hours: number) {
  const task = await ownTask(taskId, teacherId);
  if (!isTaskLocked(task.deadline)) throw new OjolError("Tugas belum melewati tenggat.");
  let deadline: Date;
  try {
    deadline = extendedDeadline(hours);
  } catch (error) {
    throw new OjolError(error instanceof Error ? error.message : "Jumlah jam tidak valid.");
  }
  await prisma.ojolTask.update({ where: { id: taskId }, data: { deadline } });
}

/** Tugas buatan guru ini ATAU yang menunjuknya sebagai co-reviewer (prd-ojol §3). */
export async function listTeacherTasks(teacherId: string) {
  return prisma.ojolTask.findMany({
    where: { OR: [{ teacherId }, { approvers: { some: { teacherId } } }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      deadline: true,
      originalDeadline: true,
      createdAt: true,
      teacherId: true,
      teacher: { select: { user: { select: { name: true } } } },
      groups: { select: { group: { select: { name: true } } } },
      _count: { select: { submissions: true, questions: true } },
      submissions: { where: { status: "pending" }, select: { id: true } },
    },
  });
}

/** Detail tugas untuk pembuat (bisa kelola) atau co-reviewer (hanya lihat hasil & koreksi). */
export async function getTeacherTask(taskId: string, teacherId: string) {
  const task = await prisma.ojolTask.findFirst({
    where: { id: taskId, OR: [{ teacherId }, { approvers: { some: { teacherId } } }] },
    include: {
      teacher: { select: { user: { select: { name: true } } } },
      approvers: { select: { teacherId: true, teacher: { select: { code: true, user: { select: { name: true } } } } } },
      questions: { orderBy: { order: "asc" } },
      groups: { select: { group: { select: { id: true, name: true, _count: { select: { members: true } } } } } },
      _count: { select: { submissions: true } },
    },
  });
  return task ? { ...task, canManage: task.teacherId === teacherId } : null;
}

/** Admin: semua tugas lintas guru untuk monitor & pengingat WhatsApp. */
export async function listAllTasks() {
  return prisma.ojolTask.findMany({
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
