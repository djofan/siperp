import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const ts = createRequire(import.meta.url)("typescript");
const source = readFileSync("modules/bantuan/intake-lifecycle.ts", "utf8");
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const { canRestoreIntake, submitIntake } = sandbox.exports;

test("new intake resumes only unfinished drafts and never restores sent or cancelled applications", () => {
  for (const status of ["draft", "needs_data"]) assert.equal(canRestoreIntake(status, false), true);
  for (const status of ["screening", "review1", "survey_assignment", "completed", "cancelled", "rejected_t1"]) assert.equal(canRestoreIntake(status, false), false);
  assert.equal(canRestoreIntake("screening", true), true);
  assert.equal(canRestoreIntake("review1", true), false);
});

test("success appears only after a deliberate submit is confirmed by the server", async () => {
  const calls = [];
  let release;
  const confirmation = new Promise(resolve => { release = resolve; });
  const operation = submitIntake({
    save: async () => { calls.push("save"); return { id: "one", status: "draft", version: 3 }; },
    submit: async row => { calls.push(`submit:${row.version}`); return confirmation; },
    committed: row => calls.push(`committed:${row.status}`),
    cleanup: async () => { calls.push("cleanup"); },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["save", "submit:3"]);
  release({ id: "one", status: "review1", version: 4 });
  await operation;
  assert.deepEqual(calls, ["save", "submit:3", "committed:review1", "cleanup"]);
});

test("failed submission keeps the draft and never shows success or clears it", async () => {
  const calls = [];
  await assert.rejects(submitIntake({
    save: async () => ({ status: "draft" }),
    submit: async () => { throw new Error("offline"); },
    committed: () => calls.push("success"), cleanup: async () => { calls.push("cleanup"); },
  }), /offline/);
  assert.deepEqual(calls, []);
});

test("a cleanup failure cannot report a confirmed server submission as failed", async () => {
  let successes = 0;
  const result = await submitIntake({
    save: async () => ({ status: "needs_data" }), submit: async () => ({ status: "review1" }),
    committed: () => { successes++; }, cleanup: async () => { throw new Error("IndexedDB unavailable"); },
  });
  assert.equal(result.cleanupFailed, true);
  assert.equal(successes, 1);
});

test("editing screening does not submit twice and unrelated stages do not trigger success", async () => {
  let submits = 0;
  const submit = async () => { submits++; return { status: "review1" }; };
  await submitIntake({ save: async () => ({ status: "screening" }), submit, committed: () => {}, cleanup: async () => {} });
  assert.equal(submits, 0);
  for (const status of ["cancelled", "completed", "review1"]) {
    await assert.rejects(submitIntake({ save: async () => ({ status }), submit, committed: () => assert.fail("Unexpected success"), cleanup: async () => assert.fail("Unexpected cleanup") }));
  }
  assert.equal(submits, 0);
});
