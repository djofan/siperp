import assert from "node:assert/strict";
import test from "node:test";
import { gradeQuiz, lessonReleased, normalizePhone, quizDeadline, weightedGrade, type QuizSnapshot } from "./policy";
import { parseParticipantsCsv, contactVcard } from "./intake-policy";
import { questionInput, quizInput } from "./admin-quiz-validation";
import { lessonInput } from "./admin-validation";

test("multiple responses require the exact correct set and use question weights", () => {
  const snapshot: QuizSnapshot = { passingScore: 70, timeLimitMinutes: 10, responses: { single: "a", multiple: ["b", "c"] }, questions: [
    { id: "single", question: "Single", weight: 1, options: [{ id: "a", label: "A", isCorrect: true }, { id: "z", label: "Z", isCorrect: false }] },
    { id: "multiple", question: "Multiple", type: "MULTIPLE", weight: 3, options: [{ id: "b", label: "B", isCorrect: true }, { id: "c", label: "C", isCorrect: true }, { id: "d", label: "D", isCorrect: false }] },
  ] };
  assert.equal(gradeQuiz(snapshot).score, 100);
  for (const selected of [["b"], ["b", "c", "d"], ["b", "b"], []]) assert.equal(gradeQuiz({ ...snapshot, responses: { single: "a", multiple: selected } }).score, 25);
  assert.equal(gradeQuiz({ ...snapshot, responses: { multiple: ["b", "c"] } }).score, 75);
});
test("weighted course grades include missing quizzes and never inflate from retakes", () => {
  const quizzes = [{ id: "d1", kind: "DAILY" as const }, { id: "d2", kind: "DAILY" as const }, { id: "w", kind: "WEEKLY" as const }, { id: "f", kind: "FINAL" as const }];
  const attempts = [{ quizId: "d1", score: 100 }, { quizId: "d1", score: 90 }, { quizId: "w", score: 80 }, { quizId: "f", score: 70 }];
  assert.equal(weightedGrade(quizzes, attempts).score, 69);
  assert.equal(weightedGrade(quizzes, attempts).complete, false);
  assert.equal(weightedGrade(quizzes, [...attempts, { quizId: "d2", score: 100 }]).score, 79);
  assert.equal(weightedGrade(quizzes, [...attempts, { quizId: "d2", score: 100 }]).complete, true);
});
test("lesson release uses WIB calendar days and never opens before program start", () => {
  const start = new Date("2026-10-01T13:00:00Z");
  assert.equal(lessonReleased(null, 1), false);
  assert.equal(lessonReleased(start, 1, new Date("2026-10-01T12:59:59Z")), false);
  assert.equal(lessonReleased(start, 1, start), true);
  assert.equal(lessonReleased(start, 2, new Date("2026-10-01T16:59:59Z")), false);
  assert.equal(lessonReleased(start, 2, new Date("2026-10-01T17:00:00Z")), true);
});
test("quiz close can shorten but cannot extend the attempt duration", () => {
  const start = new Date("2026-10-01T00:00:00Z");
  assert.equal(quizDeadline(start, 10, "2026-10-01T00:05:00Z"), Date.parse("2026-10-01T00:05:00Z"));
  assert.equal(quizDeadline(start, 10, "2026-10-01T01:00:00Z"), Date.parse("2026-10-01T00:10:00Z"));
});
test("contact input normalizes Indonesian numbers, quoted CSV and rejects duplicates", () => {
  assert.equal(normalizePhone("+62 811-1186-626"), "628111186626");
  assert.equal(normalizePhone("0811-1186-626"), "628111186626");
  assert.equal(normalizePhone("javascript:abc"), null);
  const csv = 'name,email,phone,gender\r\n"Ahmad, Abdullah",a@example.com,081234567890,IKHWAN';
  assert.equal(parseParticipantsCsv(csv)[0].name, "Ahmad, Abdullah");
  assert.throws(() => parseParticipantsCsv(csv + '\r\nLain,a@example.com,081234567891,IKHWAN'));
  assert.throws(() => parseParticipantsCsv('name,email,phone,gender\n"unterminated'));
  assert.equal(contactVcard("Ahmad\nEND:VCARD", "6281234567890", "a@example.com").match(/END:VCARD/g)?.length, 2);
  assert.ok(!contactVcard("Ahmad\nEND:VCARD", "6281234567890", "a@example.com").includes("\nEND:VCARD\r\nTEL"));
});
test("audio drafts may await recording but published materials require safe audio", () => {
  const form = new FormData();
  Object.entries({ title: "Materi", slug: "materi", order: "1", videoProvider: "AUDIO", videoUrl: "", releaseDay: "30" }).forEach(([key,value]) => form.set(key,value));
  assert.equal(lessonInput(form).videoUrl, "");
  form.set("isPublished", "on"); assert.throws(() => lessonInput(form));
  form.set("videoUrl", "/academy/audio-simulasi.wav"); assert.equal(lessonInput(form).releaseDay, 30);
  form.set("releaseDay", "31"); assert.throws(() => lessonInput(form));
});
test("question kind and schedule validation prevent invalid answer keys and windows", () => {
  const form = new FormData();
  Object.entries({ question: "Pilih", order: "1", type: "MULTIPLE", weight: "3", options: JSON.stringify([{id:"",label:"A",isCorrect:true},{id:"",label:"B",isCorrect:true},{id:"",label:"C",isCorrect:false}]) }).forEach(([key,value]) => form.set(key,value));
  assert.equal(questionInput(form).type, "MULTIPLE");
  form.set("type", "SINGLE"); assert.throws(() => questionInput(form));
  form.set("type", "TRUE_FALSE"); assert.throws(() => questionInput(form));
  const quiz = new FormData();
  Object.entries({ title: "Evaluasi", passingScore: "70", timeLimitMinutes: "10", quizDate: "2026-10-01T08:00", closesAt: "2026-10-01T07:00", kind: "FINAL", releaseDay: "30" }).forEach(([key,value]) => quiz.set(key,value));
  assert.throws(() => quizInput(quiz));
  quiz.set("closesAt", "2026-10-02T08:00"); assert.equal(quizInput(quiz).kind, "FINAL");
});

test("published material accepts text, audio or both but rejects empty content", () => {
  const form = new FormData();
  Object.entries({ title: "Materi", slug: "materi-uji", order: "1", videoProvider: "AUDIO", videoUrl: "", releaseDay: "1", isPublished: "on", contentSummary: "Materi yang dibaca peserta." }).forEach(([key, value]) => form.set(key, value));
  assert.equal(lessonInput(form).videoUrl, "");
  form.set("videoUrl", "/academy/audio-simulasi.wav");
  assert.equal(lessonInput(form).contentSummary, "Materi yang dibaca peserta.");
  form.set("contentSummary", "");
  assert.ok(lessonInput(form).videoUrl);
  form.set("videoUrl", "");
  assert.throws(() => lessonInput(form));
  form.delete("isPublished");
  assert.equal(lessonInput(form).isPublished, false);
});
