import test from "node:test";
import assert from "node:assert/strict";
import { examStatus } from "../modules/academy/exam-status.ts";

const now = new Date("2026-11-12T03:00:00Z");
const base = { isPublished: true, isActive: true, quizDate: "2026-11-12T02:00:00Z", closesAt: "2026-11-12T04:00:00Z" };
test("exam statuses distinguish draft, disabled, upcoming, open, ended and missing schedule", () => {
  assert.equal(examStatus({ ...base, isPublished: false }, now).label, "Draft");
  assert.equal(examStatus({ ...base, isActive: false }, now).label, "Nonaktif");
  assert.equal(examStatus({ ...base, quizDate: "2026-11-12T03:01:00Z" }, now).label, "Akan datang");
  assert.equal(examStatus(base, now).label, "Sedang berlangsung");
  assert.equal(examStatus({ ...base, closesAt: "2026-11-12T03:00:00Z" }, now).label, "Selesai");
  assert.equal(examStatus({ ...base, quizDate: null, closesAt: null }, now).label, "Belum dijadwalkan");
  assert.equal(examStatus({ ...base, quizDate: "2026-11-12T03:00:00Z" }, now).label, "Sedang berlangsung");
});
