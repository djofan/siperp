import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const player = fs.readFileSync("modules/academy/components/QuizPlayer.tsx", "utf8");
const actions = fs.readFileSync("modules/academy/api/actions.ts", "utf8");
const questionForm = fs.readFileSync("modules/academy/components/admin/QuestionForm.tsx", "utf8");
const questionMedia = fs.readFileSync("modules/academy/components/QuestionMedia.tsx", "utf8");

test("quiz choices stay local until the participant submits once", () => {
  assert.doesNotMatch(player, /saveQuizAnswer/);
  assert.match(player, /setAnswers\(\(previous\)/);
  assert.match(player, /finishQuiz\(attemptId, answersRef\.current\)/);
  assert.match(actions, /\{ answers, submit: true \}/);
});

test("quiz warns about unanswered question numbers before submission", () => {
  assert.match(player, /Masih ada \{incomplete\.length\} soal yang belum dijawab/);
  assert.match(player, /Periksa kembali soal nomor \{incomplete\.join\(", "\)\}/);
  assert.match(player, /Tetap kumpulkan jawaban/);
  assert.match(player, /Simpan dan kumpulkan jawaban/);
});

test("teacher questions accept private image or audio media shown to participants", () => {
  assert.match(questionForm, /name="media" type="file"/);
  assert.match(questionForm, /image\/jpeg,image\/png,image\/webp,audio\/mpeg/);
  assert.match(questionForm, /name="mediaAlt"/);
  assert.match(questionMedia, /questions\/\$\{encodeURIComponent\(question\.id\)\}\/media/);
  assert.match(questionMedia, /<Image/);
  assert.match(questionMedia, /<audio controls/);
  assert.match(player, /<QuestionMedia question=\{question\}/);
});
