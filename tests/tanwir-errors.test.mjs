import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
const testModule = { exports: {} };
const source = ts.transpileModule(readFileSync("modules/tanwir/api/errors.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, {
  module: testModule, exports: testModule.exports,
  require: (id) => { assert.equal(id, "@/lib/api"); return { ApiError }; },
});
const { errorMessage, TanwirError } = testModule.exports;

test("Tanwir forms show actionable backend validation and conflict messages", () => {
  assert.equal(errorMessage(new ApiError("Input invalid", 422, { phone: ["Nomor HP tidak valid."] })), "Nomor HP tidak valid.");
  assert.equal(errorMessage(new ApiError("Tugas sudah dikumpulkan.", 409)), "Tugas sudah dikumpulkan.");
  assert.equal(errorMessage(new TanwirError("Tidak diizinkan.")), "Tidak diizinkan.");
});

test("Tanwir forms keep unexpected and server error details private", () => {
  for (const error of [new Error("private detail"), new ApiError("private detail", 500)]) {
    assert.equal(errorMessage(error), "Data belum dapat disimpan. Coba lagi.");
  }
});
