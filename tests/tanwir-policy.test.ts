import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmit,
  detectMediaFile,
  extendedDeadline,
  fileMatchesTask,
  formatCode,
  isLateSubmission,
  isTaskLocked,
  nextAvailableCode,
  normalizeCode,
  placeholderEmail,
  quizScore,
  scoreTone,
  studentTaskState,
  toWhatsappNumber,
} from "../modules/tanwir/api/policy";

test("kode akun berurutan & melompati kode terpakai", () => {
  assert.equal(formatCode("GTQ", 1), "GTQ001");
  assert.equal(formatCode("TQ", 12), "TQ012");
  assert.equal(nextAvailableCode("PTQ", 0, new Set()), "PTQ001");
  assert.equal(nextAvailableCode("PTQ", 2, new Set(["PTQ003", "PTQ004"])), "PTQ005");
  assert.equal(normalizeCode("  gtq 001 "), "GTQ001");
  assert.equal(placeholderEmail("PTQ007"), "ptq007@tanwir.invalid");
});

test("tenggat: terkunci, terlambat, perpanjangan dari sekarang", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  const original = new Date("2026-10-07T09:00:00Z");
  assert.equal(isTaskLocked(original, now), true);
  assert.equal(isTaskLocked(new Date("2026-10-07T11:00:00Z"), now), false);
  assert.equal(isLateSubmission(original, now), true);
  assert.equal(isLateSubmission(new Date("2026-10-07T10:00:00Z"), now), false);
  assert.equal(extendedDeadline(2, now).toISOString(), "2026-10-07T12:00:00.000Z");
  assert.throws(() => extendedDeadline(0, now));
  assert.throws(() => extendedDeadline(73, now));
  assert.throws(() => extendedDeadline(1.5, now));
});

test("nilai kuis & warna nilai", () => {
  assert.equal(quizScore(2, 3), 67);
  assert.equal(quizScore(0, 0), 0);
  assert.equal(scoreTone(70), "good");
  assert.equal(scoreTone(50), "fair");
  assert.equal(scoreTone(49), "low");
});

test("status tugas peserta & hak mengumpulkan", () => {
  assert.equal(studentTaskState(null, false), "todo");
  assert.equal(studentTaskState(null, true), "locked");
  assert.equal(studentTaskState("rejected", true), "locked");
  assert.equal(studentTaskState("rejected", false), "rejected");
  assert.equal(studentTaskState("pending", true), "pending");
  assert.equal(studentTaskState("approved", true), "approved");
  assert.equal(canSubmit(null, false, "voice_note"), true);
  assert.equal(canSubmit("rejected", false, "video"), true);
  assert.equal(canSubmit("pending", false, "video"), false);
  assert.equal(canSubmit("approved", false, "video"), false);
  assert.equal(canSubmit(null, true, "video"), false);
  assert.equal(canSubmit("rejected", false, "quiz"), false);
});

test("deteksi file dari isi, bukan ekstensi", () => {
  const bytes = (head: number[] | string, pad = 16) => {
    const arr = typeof head === "string" ? [...head].map((c) => c.charCodeAt(0)) : head;
    return Uint8Array.from([...arr, ...new Array(pad).fill(0)]);
  };
  const webm = detectMediaFile(bytes([0x1a, 0x45, 0xdf, 0xa3]));
  assert.equal(webm?.ext, "webm");
  assert.equal(fileMatchesTask(webm!, "voice_note"), true);
  assert.equal(fileMatchesTask(webm!, "video"), true);
  const mp3 = detectMediaFile(bytes("ID3"));
  assert.equal(mp3?.kind, "audio");
  assert.equal(fileMatchesTask(mp3!, "video"), false);
  const mp4 = detectMediaFile(bytes([0, 0, 0, 0x18, ..."ftypisom".split("").map((c) => c.charCodeAt(0))]));
  assert.equal(mp4?.mime, "video/mp4");
  const png = detectMediaFile(bytes([0x89, ..."PNG".split("").map((c) => c.charCodeAt(0))]));
  assert.equal(png?.kind, "image");
  assert.equal(fileMatchesTask(png!, "voice_note"), false);
  assert.equal(detectMediaFile(bytes("hello world!")), null);
});

test("nomor WhatsApp", () => {
  assert.equal(toWhatsappNumber("0812-3456-789"), "628123456789");
  assert.equal(toWhatsappNumber("+62 812 345"), "62812345");
  assert.equal(toWhatsappNumber("812345"), "62812345");
  assert.equal(toWhatsappNumber(""), null);
});
