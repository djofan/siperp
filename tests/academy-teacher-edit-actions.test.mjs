import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const list = fs.readFileSync("modules/academy/pages/pengajar/ujian/page.tsx", "utf8");
const detail = fs.readFileSync("modules/academy/pages/pengajar/ujian/[quizId]/page.tsx", "utf8");
const materials = fs.readFileSync("modules/academy/pages/pengajar/materi/page.tsx", "utf8");
const actions = fs.readFileSync("modules/academy/api/teacher-actions.ts", "utf8");
const chrome = fs.readFileSync("modules/academy/components/DashboardChrome.tsx", "utf8");
const logout = fs.readFileSync("modules/academy/components/LogoutButton.tsx", "utf8");
const participantExam = fs.readFileSync("modules/academy/pages/kuis/[quizId]/page.tsx", "utf8");
const adminLayout = fs.readFileSync("modules/academy/admin/pages/layout.tsx", "utf8");

test("teacher exam table exposes separate edit and question management actions", () => {
  assert.match(list, /\?edit=ujian&back=/);
  assert.match(list, />Edit ujian<\/Link>/);
  assert.match(list, /#daftar-soal/);
  assert.match(list, />Kelola soal<\/Link>/);
});

test("teacher question table exposes an edit action and opens the selected form", () => {
  assert.match(detail, /query\.edit === "ujian"/);
  assert.match(detail, /id="edit-ujian" open=\{editingQuiz\}/);
  assert.match(detail, /id="daftar-soal"/);
  assert.match(detail, />Edit soal<\/Link>/);
  assert.match(detail, /id="edit-soal"/);
});

test("successful material and exam saves return to their tables with a notification", () => {
  assert.match(actions, /listReturn\("\/academy\/pengajar\/materi", form.get\("back"\)\)/);
  assert.match(actions, /listReturn\("\/academy\/pengajar\/ujian", form.get\("back"\)\)/);
  assert.match(actions, /visibility=/);
  assert.match(materials, /Materi berhasil dibuat\./);
  assert.match(materials, /Materi berhasil diperbarui\./);
  assert.match(list, /Ujian berhasil dibuat\./);
  assert.match(list, /Ujian berhasil diperbarui\./);
  assert.match(materials, /role="status"/);
  assert.match(list, /role="status"/);
});

test("academy navigation highlights aliased detail routes and keeps the top bar focused", () => {
  assert.match(chrome, /participant-edit.*\/admin\/academy\/peserta/);
  assert.match(chrome, /\/admin\/academy\/program\/.*\/admin\/academy\/kuis/);
  assert.match(chrome, /\/admin\/academy\/program.*\/admin\/academy\/materi/);
  assert.match(chrome, /\/academy\/program\/.*\/academy\/materi/);
  assert.match(adminLayout, /href: "\/admin\/academy\/materi", label: "Materi"/);
  assert.doesNotMatch(adminLayout, /href: "\/admin\/academy\/program", label: "Materi"/);
  assert.doesNotMatch(chrome, />Website /);
  assert.doesNotMatch(logout, /Ubah password/);
  assert.match(participantExam, /Kembali ke daftar ujian/);
});
