import assert from "node:assert/strict";
import test from "node:test";
import { questionInput, quizDateInput, quizInput } from "./admin-quiz-validation";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};
const quiz = { title: "Kuis", passingScore: "70", timeLimitMinutes: "10" };
const options = [{ id: "", label: "A", isCorrect: true }, { id: "", label: "B", isCorrect: false }];
const question = (value: unknown) => form({ question: "Pertanyaan", order: "0", options: JSON.stringify(value) });

test("quiz date uses explicit WIB and rejects impossible dates", () => {
  const result = quizInput(form({ ...quiz, quizDate: "2028-02-29T08:30" }));
  assert.equal(result.quizDate?.toISOString(), "2028-02-29T01:30:00.000Z");
  assert.equal(quizDateInput(result.quizDate), "2028-02-29T08:30");
  assert.equal(quizInput(form(quiz)).quizDate, null);
  for (const date of ["2027-02-29T08:30", "2028-13-01T00:00", "2028-01-01T24:00", "today", "2028-01-01T08:30Z"]) {
    assert.throws(() => quizInput(form({ ...quiz, quizDate: date })));
  }
});

test("quiz validates duration, score and activation independently of HTML controls", () => {
  for (const timeLimitMinutes of ["0", "-1", "1.5", "1441"]) assert.throws(() => quizInput(form({ ...quiz, timeLimitMinutes })));
  for (const passingScore of ["101", "-1", "0.1"]) assert.throws(() => quizInput(form({ ...quiz, passingScore })));
  assert.throws(() => quizInput(form({ ...quiz, isActive: "on" })));
  assert.equal(quizInput(form({ ...quiz, isActive: "on", isPublished: "on" })).isActive, true);
});

test("questions require 2–10 distinct options and exactly one correct answer", () => {
  assert.equal(questionInput(question(options)).options.length, 2);
  for (const value of [[], options.slice(0, 1), Array(11).fill(options[0]), options.map(item => ({ ...item, isCorrect: false })),
    options.map(item => ({ ...item, isCorrect: true })), options.map(item => ({ ...item, label: "Same" })),
    options.map(item => ({ ...item, id: "duplicate" })), [{ label: "A", isCorrect: "true" }, options[1]],
    [{ ...options[0], label: "" }, options[1]]]) assert.throws(() => questionInput(question(value)));
});
