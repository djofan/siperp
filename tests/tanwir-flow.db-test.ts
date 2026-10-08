// Uji alur bisnis Tanwir Qurani terhadap MySQL LOKAL (docs/prd-tanwir.md §6).
// Jalankan: npm run test:tanwir (memakai --conditions=react-server untuk modul "server-only").
// Sengaja tidak bernama *.test.ts supaya tidak ikut `npm test` (butuh flag kondisi di atas).
// Semua data uji dibuat dengan penanda unik dan dihapus lagi di akhir.
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function wibInput(offsetMs: number) {
  return new Date(Date.now() + offsetMs + 7 * 3_600_000).toISOString().slice(0, 16);
}

test("alur tugas, setoran, koreksi, kuis, tenggat & anak didik", { timeout: 120000 }, async () => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Uji ini hanya untuk database lokal.");

  const uploadDir = await mkdtemp(path.join(os.tmpdir(), "tanwir-test-"));
  process.env.TANWIR_UPLOAD_DIR = uploadDir;

  const { prisma } = await import("@/lib/prisma");
  const { TanwirError } = await import("@/modules/tanwir/api/errors");
  const { createMember } = await import("@/modules/tanwir/api/members");
  const { createGroup } = await import("@/modules/tanwir/api/groups");
  const { createTask, extendTask, updateTask } = await import("@/modules/tanwir/api/tasks");
  const submissions = await import("@/modules/tanwir/api/submissions");
  const students = await import("@/modules/tanwir/api/students");

  const tag = `uji-${randomUUID().slice(0, 8)}`;
  const userIds: string[] = [];
  const groupIds: string[] = [];
  const taskIds: string[] = [];
  const member = async (role: "guru" | "peserta", groupId = "") => {
    const created = await createMember(role, form({ name: `${tag} ${role}`, password: "rahasia-uji-123", isActive: "on", groupId }));
    const row = await prisma.tanwirMember.findUniqueOrThrow({ where: { id: created.id }, select: { id: true, userId: true, groupId: true, code: true } });
    userIds.push(row.userId);
    return row;
  };
  const audio = (name = "setoran.mp3") => new File([Uint8Array.from([0x49, 0x44, 0x33, ...new Array(2048).fill(0)])], name, { type: "audio/mpeg" });
  const rejects = (promise: Promise<unknown>, pattern: RegExp) =>
    assert.rejects(promise, (error: unknown) => error instanceof TanwirError && pattern.test(error.message));

  try {
    // Akun & kode otomatis
    const guru = await member("guru");
    const guruLain = await member("guru");
    assert.match(guru.code, /^GTQ\d{3,}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: guru.userId }, select: { email: true } });
    assert.equal(user.email, `${guru.code.toLowerCase()}@tanwir.invalid`);

    const group = await createGroup(form({ name: `${tag} kelompok`, picId: guru.id }));
    groupIds.push(group.id);
    const peserta = await member("peserta", group.id);
    const pesertaLuar = await member("peserta");
    assert.match(peserta.code, /^PTQ\d{3,}$/);

    // §6.1 tugas otomatis terkirim ke kelompok PIC
    const task = await createTask(guru.id, form({ title: `${tag} setoran`, description: "Baca Al-Mulk 1-10", type: "voice_note", deadline: wibInput(86_400_000) }));
    taskIds.push(task.id);
    const sent = await prisma.tanwirTaskGroup.findMany({ where: { taskId: task.id } });
    assert.deepEqual(sent.map((row) => row.groupId), [group.id]);

    // §6.9 visibilitas
    assert.equal((await submissions.listStudentTasks(peserta)).find((row) => row.id === task.id)?.state, "todo");
    assert.equal((await submissions.listStudentTasks(pesertaLuar)).length, 0);
    await rejects(submissions.submitMedia(task.id, pesertaLuar, audio()), /tidak ditemukan/);

    // §6.10 tipe file divalidasi dari isi
    const palsu = new File([new Uint8Array(2048).fill(7)], "bukan.mp3", { type: "audio/mpeg" });
    await rejects(submissions.submitMedia(task.id, peserta, palsu), /Format file/);

    // §6.5 kirim pertama → pending, tidak bisa kirim lagi
    assert.equal((await submissions.submitMedia(task.id, peserta, audio())).isLate, false);
    await rejects(submissions.submitMedia(task.id, peserta, audio()), /sudah dikumpulkan/);
    const pending = await prisma.tanwirSubmission.findUniqueOrThrow({ where: { taskId_studentId: { taskId: task.id, studentId: peserta.id } } });
    assert.equal(pending.status, "pending");
    assert.equal(pending.attemptsCount, 1);

    // §6.7 koreksi hanya oleh pembuat; tolak wajib alasan
    assert.equal((await submissions.listReviewQueue(guruLain.id)).length, 0);
    await rejects(submissions.reviewSubmission(pending.id, guruLain.id, "approved", ""), /tidak ditemukan/);
    await rejects(submissions.reviewSubmission(pending.id, guru.id, "rejected", "  "), /Alasan/);
    await submissions.reviewSubmission(pending.id, guru.id, "rejected", "Mad belum tepat");
    await rejects(submissions.reviewSubmission(pending.id, guru.id, "approved", ""), /sudah dikoreksi/);

    // §6.6 kirim ulang → percobaan 2, file lama terhapus
    const oldFile = pending.filePath!;
    await submissions.submitMedia(task.id, peserta, audio());
    const resent = await prisma.tanwirSubmission.findUniqueOrThrow({ where: { id: pending.id } });
    assert.equal(resent.status, "pending");
    assert.equal(resent.attemptsCount, 2);
    assert.notEqual(resent.filePath, oldFile);
    const files = await readdir(path.join(uploadDir, "submissions", task.id, peserta.id));
    assert.equal(files.length, 1);

    await submissions.reviewSubmission(resent.id, guru.id, "approved", "");
    const logs = await prisma.tanwirSubmissionLog.findMany({ where: { submissionId: resent.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(logs.map((log) => [log.status, log.attemptNumber]), [["rejected", 1], ["approved", 2]]);
    assert.equal(logs[1].feedback, "Tugas disetujui.");

    // §6.8 kuis: kunci tidak bocor sebelum dikumpulkan, nilai otomatis, sekali saja
    const questions = JSON.stringify([
      { question: "1+1?", optionA: "2", optionB: "3", correctOption: "a" },
      { question: "Ibukota?", optionA: "Bandung", optionB: "Jakarta", optionC: "Bogor", correctOption: "b" },
    ]);
    const quiz = await createTask(guru.id, form({ title: `${tag} kuis`, description: "Kuis", type: "quiz", deadline: wibInput(86_400_000), questions }));
    taskIds.push(quiz.id);
    const before = await submissions.getStudentTaskDetail(quiz.id, peserta);
    assert.ok(before);
    assert.equal(before.questions.length, 2);
    assert.equal("correctOption" in before.questions[0] && before.questions[0].correctOption !== undefined, false);
    await rejects(submissions.submitQuiz(quiz.id, peserta, { [before.questions[0].id]: "a" }), /Semua soal/);
    const graded = await submissions.submitQuiz(quiz.id, peserta, { [before.questions[0].id]: "a", [before.questions[1].id]: "c" });
    assert.deepEqual([graded.score, graded.correct, graded.total], [50, 1, 2]);
    await rejects(submissions.submitQuiz(quiz.id, peserta, { [before.questions[0].id]: "a", [before.questions[1].id]: "b" }), /sudah/);
    const quizRow = await prisma.tanwirSubmission.findUniqueOrThrow({ where: { taskId_studentId: { taskId: quiz.id, studentId: peserta.id } } });
    assert.equal(quizRow.status, "approved");
    assert.equal((await submissions.listReviewQueue(guru.id)).length, 0);
    // Soal terkunci setelah ada pengumpulan
    await updateTask(quiz.id, guru.id, form({ title: `${tag} kuis v2`, description: "Kuis", type: "quiz", deadline: wibInput(86_400_000), questions: "[]" }));
    assert.equal(await prisma.tanwirQuizQuestion.count({ where: { taskId: quiz.id } }), 2);

    // §6.2–6.4 terkunci, perpanjang oleh pembuat, terlambat
    const late = await createTask(guru.id, form({ title: `${tag} tenggat`, description: "Video", type: "video", deadline: wibInput(3_600_000) }));
    taskIds.push(late.id);
    const past = new Date(Date.now() - 60_000);
    await prisma.tanwirTask.update({ where: { id: late.id }, data: { deadline: past, originalDeadline: past } });
    assert.equal((await submissions.listStudentTasks(peserta)).find((row) => row.id === late.id)?.state, "locked");
    await rejects(submissions.submitMedia(late.id, peserta, audio()), /Tenggat/);
    await rejects(extendTask(late.id, guruLain.id, 2), /tidak ditemukan/);
    await rejects(extendTask(late.id, guru.id, 0), /1–72/);
    await extendTask(late.id, guru.id, 2);
    await rejects(extendTask(late.id, guru.id, 2), /belum melewati/);
    const video = new File([Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, ...new Array(2048).fill(0)])], "rekaman.webm", { type: "video/webm" });
    assert.equal((await submissions.submitMedia(late.id, peserta, video)).isLate, true);

    // §6.12 anak didik: lingkup peserta, guru PIC, guru lain
    await students.saveStudent({ kind: "peserta", memberId: peserta.id }, null, form({ name: `${tag} santri`, age: "9" }));
    assert.equal((await students.listStudents({ kind: "guru", teacherId: guru.id }, tag)).length, 1);
    assert.equal((await students.listStudents({ kind: "guru", teacherId: guruLain.id }, tag)).length, 0);
    await rejects(students.saveStudent({ kind: "guru", teacherId: guruLain.id }, null, form({ name: "x", memberId: peserta.id })), /peserta/);

    // §6.11 file hanya untuk pemilik, pembuat tugas, admin
    const fileFor = (viewer: { isAdmin: boolean; member: { id: string } | null }) => submissions.authorizeSubmissionFile(resent.id, viewer);
    assert.ok(await fileFor({ isAdmin: false, member: { id: peserta.id } }));
    assert.ok(await fileFor({ isAdmin: false, member: { id: guru.id } }));
    assert.ok(await fileFor({ isAdmin: true, member: null }));
    assert.equal(await fileFor({ isAdmin: false, member: { id: guruLain.id } }), null);
    assert.equal(await fileFor({ isAdmin: false, member: { id: pesertaLuar.id } }), null);
  } finally {
    await prisma.tanwirTask.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.tanwirGroup.deleteMany({ where: { id: { in: groupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await rm(uploadDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
});
