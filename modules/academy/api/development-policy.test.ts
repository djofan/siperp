import assert from "node:assert/strict";
import test from "node:test";
import { examOpensAt, reminderState, reviewAvailable } from "./development-policy";
test("exam release respects WIB day, exact start and additional opening time", () => {
  const starts = new Date("2026-10-01T10:00:00+07:00");
  assert.equal(examOpensAt(starts, 1, null)?.toISOString(), starts.toISOString());
  assert.equal(examOpensAt(starts, 8, null)?.toISOString(), "2026-10-07T17:00:00.000Z");
  assert.equal(examOpensAt(null, 1, null), null);
  const later = new Date("2026-10-09T10:00:00+07:00");
  assert.equal(examOpensAt(starts, 8, later)?.toISOString(), later.toISOString());
});
test("review never opens before both the current and persisted exam close", () => {
  const close = new Date("2026-10-01T10:00:00Z");
  assert.equal(reviewAvailable(null, close.toISOString()), false);
  assert.equal(reviewAvailable(close, null, new Date("2026-10-01T09:59:59Z")), false);
  assert.equal(reviewAvailable(close, null, close), true);
  assert.equal(reviewAvailable(close, "2026-10-02T10:00:00Z", close), false);
});
test("reminders distinguish upcoming, open, due and missed and suppress completed exams", () => {
  const now = new Date("2026-10-01T10:00:00Z");
  assert.equal(reminderState(null,null,false,now), null);
  assert.equal(reminderState(new Date("2026-10-20"),null,false,now), null);
  assert.equal(reminderState(new Date("2026-10-02"),null,false,now), "upcoming");
  assert.equal(reminderState(new Date("2026-10-01"),null,false,now), "open");
  assert.equal(reminderState(new Date("2026-10-01"),new Date("2026-10-01T11:00:00Z"),false,now), "due");
  assert.equal(reminderState(new Date("2026-10-01"),now,false,now), "missed");
  assert.equal(reminderState(new Date("2026-10-01"),now,true,now), null);
});
