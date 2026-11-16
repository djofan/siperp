import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(fail = false, participant = false) {
  let path;
  const module = { exports: {} };
  class ApiError extends Error {}
  const source = ts.transpileModule(fs.readFileSync(participant ? "modules/academy/api/discussion-actions.ts" : "modules/academy/api/teacher-actions.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Math, String, revalidatePath() {}, require(name) {
    if (name === "@/modules/academy/pwa/server-navigation") return { academyServerHref: async path => path };
    if (name === "@/lib/api") return { ApiError, apiRequest: async (url, options) => { path = [url, options.method]; if (fail) throw new ApiError("Jawaban gagal"); return true; } };
    if (name === "next/cache") return { revalidatePath() {} };
    if (name === "next/navigation") return { redirect(url) { throw Object.assign(new Error("redirect"), { url }); } };
    throw new Error(name);
  } });
  return { answer: participant ? module.exports.askParticipantQuestion : module.exports.answerTeacherDiscussion, path: () => path };
}
test("successful teacher answer returns to the discussion table preserving page", async () => {
  const loaded = load();
  await assert.rejects(loaded.answer("discussion-id", 2, { error: "" }, new FormData()), error => error.url === "/academy/pengajar/pertanyaan?saved=1&page=2");
  assert.equal(loaded.path()[0], "academy/discussions/discussion-id/answer");
  assert.equal(loaded.path()[1], "PUT");
});
test("failed answer stays on the answer form with its error", async () => {
  const loaded = load(true);
  const state = await loaded.answer("discussion-id", 2, { error: "" }, new FormData());
  assert.equal(state.error, "Jawaban gagal");
});

test("participant question returns to its table only after successful submission", async () => {
  const loaded = load(false, true);
  const form = new FormData(); form.set("courseId", "course-id"); form.set("question", "Pertanyaan peserta");
  await assert.rejects(loaded.answer({ error: "" }, form), error => error.url === "/academy/tanya-jawab?saved=1");
  assert.equal(loaded.path()[0], "academy/courses/course-id/questions");
});
test("participant submission failure keeps its form error", async () => {
  const loaded = load(true, true);
  const form = new FormData(); form.set("courseId", "course-id");
  assert.equal((await loaded.answer({ error: "" }, form)).error, "Jawaban gagal");
});
