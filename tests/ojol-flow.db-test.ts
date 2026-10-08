// Uji alur bisnis Ojol Mengaji terhadap MySQL LOKAL (docs/prd-ojol.md).
// Jalankan: npm run test:ojol (memakai --conditions=react-server untuk modul "server-only").
// Sengaja tidak bernama *.test.ts supaya tidak ikut `npm test` (butuh flag kondisi di atas).
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

function form(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const wibInput = (offsetMs: number) => new Date(Date.now() + offsetMs + 7 * 3_600_000).toISOString().slice(0, 16);

test("ojol: kelompok pilihan, co-reviewer, setoran, kuis & tenggat", { timeout: 120000 }, async () => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Uji ini hanya untuk database lokal.");

  const uploadDir = await mkdtemp(path.join(os.tmpdir(), "ojol-test-"));
  process.env.OJOL_UPLOAD_DIR = uploadDir;

  const { prisma } = await import("@/lib/prisma");
  const { OjolError } = await import("@/modules/ojol/api/errors");
  const { createMember } = await import("@/modules/ojol/api/members");
  const { createGroup } = await import("@/modules/ojol/api/groups");
  const { createTask, deleteTask, extendTask, getTeacherTask, listTeacherTasks, updateTask } = await import("@/modules/ojol/api/tasks");
  const submissions = await import("@/modules/ojol/api/submissions");

  const tag = `uji-${randomUUID().slice(0, 8)}`;
  const userIds: string[] = [];
  const groupIds: string[] = [];
  const taskIds: string[] = [];
  const member = async (role: "guru" | "peserta", groupId = "") => {
    const created = await createMember(role, form({ name: `${tag} ${role}`, password: "rahasia-uji-123", isActive: "on", groupId }));
    const row = await prisma.ojolMember.findUniqueOrThrow({ where: { id: created.id }, select: { id: true, userId: true, groupId: true, code: true } });
    userIds.push(row.userId);
    return row;
  };
  const audio = () => new File([Uint8Array.from([0x49, 0x44, 0x33, ...new Array(2048).fill(0)])], "setoran.mp3", { type: "audio/mpeg" });
  const rejects = (promise: Promise<unknown>, pattern: RegExp) =>
    assert.rejects(promise, (error: unknown) => error instanceof OjolError && pattern.test(error.message));

  try {
    const guru = await member("guru");
    const coReviewer = await member("guru");
    const guruLain = await member("guru");
    assert.match(guru.code, /^GOM\d{3,}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: guru.userId }, select: { email: true } });
    assert.equal(user.email, `${guru.code.toLowerCase()}@ojol.invalid`);

    const groupA = await createGroup(form({ name: `${tag} Basecamp A` }));
    const groupB = await createGroup(form({ name: `${tag} Basecamp B` }));
    groupIds.push(groupA.id, groupB.id);
    const pesertaA = await member("peserta", groupA.id);
    const pesertaB = await member("peserta", groupB.id);
    assert.match(pesertaA.code, /^POM\d{3,}$/);

    // Kelompok penerima wajib dipilih; co-reviewer harus guru
    const base = { title: `${tag} setoran`, description: "An-Naba 1-16", type: "voice_note", deadline: wibInput(86_400_000) };
    await rejects(createTask(guru.id, form(base)), /minimal satu kelompok/);
    await rejects(createTask(guru.id, form({ ...base, groupIds: groupA.id, approverIds: pesertaA.id })), /Co-reviewer/);

    // Tugas hanya sampai ke kelompok terpilih; pembuat tidak dicatat sebagai co-reviewer
    const task = await createTask(guru.id, form({ ...base, groupIds: groupA.id, approverIds: [coReviewer.id, guru.id] }));
    taskIds.push(task.id);
    const approvers = await prisma.ojolTaskApprover.findMany({ where: { taskId: task.id } });
    assert.deepEqual(approvers.map((row) => row.teacherId), [coReviewer.id]);
    assert.equal((await submissions.listStudentTasks(pesertaA)).length, 1);
    assert.equal((await submissions.listStudentTasks(pesertaB)).length, 0);

    // Co-reviewer melihat tugas & antrean, tapi tidak bisa mengelola
    assert.ok((await listTeacherTasks(coReviewer.id)).some((row) => row.id === task.id));
    assert.equal((await listTeacherTasks(guruLain.id)).length, 0);
    assert.equal((await getTeacherTask(task.id, coReviewer.id))?.canManage, false);
    assert.equal((await getTeacherTask(task.id, guru.id))?.canManage, true);
    assert.equal(await getTeacherTask(task.id, guruLain.id), null);
    await rejects(updateTask(task.id, coReviewer.id, form({ ...base, groupIds: groupA.id })), /tidak ditemukan/);
    await rejects(deleteTask(task.id, coReviewer.id), /tidak ditemukan/);

    // Setoran → co-reviewer menolak → kirim ulang → pembuat menyetujui
    await submissions.submitMedia(task.id, pesertaA, audio());
    const sub = await prisma.ojolSubmission.findUniqueOrThrow({ where: { taskId_studentId: { taskId: task.id, studentId: pesertaA.id } } });
    assert.equal((await submissions.listReviewQueue(coReviewer.id)).length, 1);
    assert.equal((await submissions.listReviewQueue(guruLain.id)).length, 0);
    await rejects(submissions.reviewSubmission(sub.id, guruLain.id, "approved", ""), /tidak ditemukan/);
    await submissions.reviewSubmission(sub.id, coReviewer.id, "rejected", "Waqaf belum tepat");
    await submissions.submitMedia(task.id, pesertaA, audio());
    await submissions.reviewSubmission(sub.id, guru.id, "approved", "");
    const logs = await prisma.ojolSubmissionLog.findMany({ where: { submissionId: sub.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(logs.map((log) => [log.status, log.reviewerId, log.attemptNumber]), [["rejected", coReviewer.id, 1], ["approved", guru.id, 2]]);

    // Akses file: pemilik, pembuat, co-reviewer, admin — bukan guru lain / peserta lain
    const fileFor = (viewer: { isAdmin: boolean; member: { id: string } | null }) => submissions.authorizeSubmissionFile(sub.id, viewer);
    assert.ok(await fileFor({ isAdmin: false, member: { id: coReviewer.id } }));
    assert.ok(await fileFor({ isAdmin: false, member: { id: guru.id } }));
    assert.equal(await fileFor({ isAdmin: false, member: { id: guruLain.id } }), null);
    assert.equal(await fileFor({ isAdmin: false, member: { id: pesertaB.id } }), null);

    // Ubah tugas: pindah kelompok & lepas co-reviewer
    await updateTask(task.id, guru.id, form({ ...base, groupIds: [groupA.id, groupB.id] }));
    assert.equal((await submissions.listStudentTasks(pesertaB)).length, 1);
    assert.equal(await prisma.ojolTaskApprover.count({ where: { taskId: task.id } }), 0);

    // Kuis: nilai otomatis, sekali saja
    const quiz = await createTask(
      guru.id,
      form({
        title: `${tag} kuis`,
        description: "Kuis",
        type: "quiz",
        deadline: wibInput(86_400_000),
        groupIds: groupA.id,
        questions: JSON.stringify([
          { question: "1+1?", optionA: "2", optionB: "3", correctOption: "a" },
          { question: "2+2?", optionA: "3", optionB: "4", correctOption: "b" },
        ]),
      }),
    );
    taskIds.push(quiz.id);
    const detail = await submissions.getStudentTaskDetail(quiz.id, pesertaA);
    assert.ok(detail);
    const graded = await submissions.submitQuiz(quiz.id, pesertaA, { [detail.questions[0].id]: "a", [detail.questions[1].id]: "b" });
    assert.equal(graded.score, 100);
    await rejects(submissions.submitQuiz(quiz.id, pesertaA, { [detail.questions[0].id]: "a", [detail.questions[1].id]: "b" }), /sudah/);

    // Tenggat: hanya pembuat yang bisa memperpanjang; terlambat setelah tenggat awal
    const late = await createTask(guru.id, form({ ...base, title: `${tag} tenggat`, groupIds: groupB.id, approverIds: coReviewer.id }));
    taskIds.push(late.id);
    const past = new Date(Date.now() - 60_000);
    await prisma.ojolTask.update({ where: { id: late.id }, data: { deadline: past, originalDeadline: past } });
    await rejects(submissions.submitMedia(late.id, pesertaB, audio()), /Tenggat/);
    await rejects(extendTask(late.id, coReviewer.id, 2), /tidak ditemukan/);
    await extendTask(late.id, guru.id, 2);
    assert.equal((await submissions.submitMedia(late.id, pesertaB, audio())).isLate, true);
  } finally {
    await prisma.ojolTask.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.ojolGroup.deleteMany({ where: { id: { in: groupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await rm(uploadDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
});
