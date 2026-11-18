import test from "node:test";
import assert from "node:assert/strict";
import { participantExamStatus } from "../modules/academy/participant-exam-status.ts";

const now = new Date("2026-11-18T10:00:00Z");
const exam = { isActive: true, quizDate: new Date("2026-11-17T10:00:00Z"), closesAt: now };

test("expired unattempted exams explain they were missed, including at the deadline", () => {
  const status = participantExamStatus(exam, true, false, now);
  assert.equal(status.available, false);
  assert.match(status.message, /Anda melewatkan ujian ini/);
  assert.match(participantExamStatus(exam, true, true, now).message, /tidak dapat melanjutkan/);
});

test("manual date changes, upcoming and inactive exams have distinct states", () => {
  const reopened = { ...exam, closesAt: new Date("2026-11-19T10:00:00Z") };
  assert.equal(participantExamStatus(reopened, true, false, now).available, true);
  assert.match(participantExamStatus({ ...reopened, isActive: false }, true, false, now).message, /dinonaktifkan/);
  assert.match(participantExamStatus({ ...reopened, quizDate: reopened.closesAt }, true, false, now).message, /belum dibuka/);
  assert.equal(participantExamStatus(reopened, false, false, now).available, false);
});
