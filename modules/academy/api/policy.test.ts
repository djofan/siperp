import assert from "node:assert/strict";
import test from "node:test";
import { gradeQuiz, isCourseComplete, quizDeadline, readSnapshot, safeResourceUrl, videoEmbedUrl, type QuizSnapshot } from "./policy";

const quiz: QuizSnapshot = {
  passingScore: 70, timeLimitMinutes: 10,
  questions: [1, 2, 3].map((number) => ({ id: `q${number}`, question: `Question ${number}`, options: [
    { id: `yes${number}`, label: "Correct", isCorrect: true },
    { id: `no${number}`, label: "Incorrect", isCorrect: false },
  ] })), responses: {},
};

test("quiz score retains decimals and uses its own passing threshold", () => {
  const snapshot = { ...quiz, responses: { q1: "yes1", q2: "yes2" } };
  assert.deepEqual(gradeQuiz(snapshot), { score: 66.67, passed: false });
  assert.deepEqual(gradeQuiz({ ...snapshot, passingScore: 60 }), { score: 66.67, passed: true });
});

test("missing answers and options from another question cannot score", () => {
  assert.deepEqual(gradeQuiz({ ...quiz, responses: { q1: "yes2", unknown: "yes1" } }), { score: 0, passed: false });
  assert.deepEqual(gradeQuiz({ ...quiz, questions: [], passingScore: 0 }), { score: 0, passed: false });
});

test("snapshot grade is independent of later edits to the question source", () => {
  const snapshot = structuredClone({ ...quiz, responses: { q1: "yes1", q2: "yes2", q3: "yes3" } });
  const modified = structuredClone(snapshot);
  modified.questions[0].options[0].isCorrect = false;
  assert.deepEqual(gradeQuiz(snapshot), { score: 100, passed: true });
  assert.equal(gradeQuiz(modified).score, 66.67);
});

test("certificate needs nonempty lessons, all completed, and every quiz passed", () => {
  assert.equal(isCourseComplete(0, 0, 0, 0), false);
  assert.equal(isCourseComplete(3, 2, 1, 1), false);
  assert.equal(isCourseComplete(3, 3, 1, 0), false);
  assert.equal(isCourseComplete(3, 3, 1, 1), true);
  assert.equal(isCourseComplete(3, 3, 0, 0), true);
});

test("deadline is derived from the persisted start rather than page reload time", () => {
  assert.equal(quizDeadline(new Date("2026-09-18T03:00:00Z"), 10), Date.parse("2026-09-18T03:10:00Z"));
  assert.throws(() => readSnapshot(null));
  assert.throws(() => readSnapshot({}));
});

test("resource URLs reject script, insecure, credential and protocol-relative URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "/\n/evil.example", "/\t/evil.example", "http://example.com/a", "https://user:secret@example.com/a"]) assert.equal(safeResourceUrl(url), null, url);
  assert.equal(safeResourceUrl("/uploads/material.pdf"), "/uploads/material.pdf");
  assert.equal(safeResourceUrl("https://example.com/material.pdf"), "https://example.com/material.pdf");
});

test("video embeds only use recognized video provider hosts", () => {
  assert.equal(videoEmbedUrl("YOUTUBE", "https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbedUrl("YOUTUBE", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbedUrl("VIMEO", "https://vimeo.com/123456"), "https://player.vimeo.com/video/123456");
  assert.equal(videoEmbedUrl("BUNNY", "https://iframe.mediadelivery.net/embed/123/abc"), "https://iframe.mediadelivery.net/embed/123/abc");
  for (const url of ["https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "https://example.com/embed/123", "http://youtu.be/dQw4w9WgXcQ"]) {
    assert.equal(videoEmbedUrl("YOUTUBE", url), null);
    assert.equal(videoEmbedUrl("BUNNY", url), null);
  }
});
