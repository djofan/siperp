import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, csvCell, integer, isStatus, nextStatuses } from "../modules/teknisi/api/policy";
test("alur servis mencegah loncat dari penerimaan ke pengambilan", () => {
  assert.equal(canTransition("received", "collected"), false);
  for (const [from, to] of [["received", "diagnosis"], ["diagnosis", "approval"], ["approval", "repairing"], ["repairing", "paused"], ["paused", "repairing"], ["repairing", "ready"], ["ready", "collected"]]) assert.equal(canTransition(from, to), true);
  assert.deepEqual(nextStatuses("collected"), []);
  assert.equal(canTransition("cancelled", "repairing"), false);
  assert.equal(isStatus("toString"), false);
  assert.equal(canTransition("invalid", "diagnosis"), false);
});
test("nominal harus bilangan bulat nonnegatif", () => {
  const form = new FormData();
  for (const value of ["-1", "1.5", "NaN", "", "1000000001"]) { form.set("quantity", value); assert.throws(() => integer(form, "quantity")); }
  form.set("quantity", "0"); assert.throws(() => integer(form, "quantity", 1));
  form.set("quantity", "2"); assert.equal(integer(form, "quantity", 1), 2);
});
test("CSV mencegah eksekusi formula dan mengapit tanda kutip", () => {
  assert.equal(csvCell('LCD "A"'), '"LCD ""A"""');
  for (const value of ["=HYPERLINK(1)", "+1", "@SUM(A1)", "-1", "  =1"]) assert.ok(csvCell(value).startsWith('"\''));
});
