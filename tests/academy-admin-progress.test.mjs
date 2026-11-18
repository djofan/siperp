import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url), React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
function load(file, stubs) {
  const context = { exports: {}, URLSearchParams, require: name => Object.hasOwn(stubs, name) ? stubs[name] : require(name) };
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const element = tag => ({ children, ...props }) => React.createElement(tag, props, children);
const panel = load("modules/academy/components/admin/ParticipantProgress.tsx", {
  "next/link": { default: element("a") },
  "@/components/ui/Card": { Card: element("section"), CardTitle: element("h2") },
  "@/components/ui/FormField": { Input: element("input"), Select: element("select") },
  "@/components/ui/Button": { buttonVariants: () => "button" },
  "./ParticipantUi": { adminDate: d => d ? new Date(d).toISOString() : "—", PageLinks: () => null },
  "./AdminUi": { AdminEmpty: element("p") },
});
const person = { id: "p3", name: "Peserta QA", nis: "PAZ003", gender: "IKHWAN", active: true };
const summary = { completedQuizzes: 1, totalQuizzes: 3, allCompleted: false, score: 0, predicate: "Maqbul", finalCompleted: false, averageScore: 0 };

test("admin progress filters and participant links retain the selected cohort", () => {
  const data = { cohorts: [{ id: "c1", title: "Angkatan QA" }], cohort: { id: "c1", title: "Angkatan QA" }, items: [{ ...person, ...summary }], total: 1, page: 1, pages: 1, totalQuizzes: 3, fullyCompletedParticipants: 0 };
  const html = renderToStaticMarkup(React.createElement(panel.ParticipantProgressDirectory, { data, search: "PAZ003", group: "IKHWAN" }));
  assert.match(html, /name="cohort"/); assert.match(html, /name="q"/); assert.match(html, /name="group"/);
  assert.match(html, /\/admin\/academy\/progres\/p3\?cohort=c1/);
  assert.match(html, /1\/3/); assert.match(html, /PAZ003/); assert.match(html, /Sementara/);
  assert.doesNotMatch(html, /Belum lulus|Per bab|Nilai berbobot/);
});

test("exam detail displays zero grades and distinguishes unanswered expired and completed exams", () => {
  const quiz = { kind: "DAILY", number: 1, score: null, startedAt: null, submittedAt: null, opensAt: null, closesAt: null, timeLimitMinutes: 4 };
  const data = { person, cohort: { id: "c1", title: "Angkatan QA" }, summary, quizzes: [
    { ...quiz, id: "q1", title: "Soal selesai", status: "completed", score: 0 },
    { ...quiz, id: "q2", title: "Soal belum", status: "not_started", number: 2 },
    { ...quiz, id: "q3", title: "Soal habis", status: "expired", number: 3 },
  ] };
  const html = renderToStaticMarkup(React.createElement(panel.ParticipantProgressDetail, { data }));
  assert.match(html, /Nilai total sementara/); assert.match(html, /Selesai/); assert.match(html, /Belum dikerjakan/); assert.match(html, /Waktu habis/);
  assert.match(html, /tabular-nums">0<\/td>/); assert.doesNotMatch(html, /Belum lulus|Per bab|Nilai Anda/);
  const final = renderToStaticMarkup(React.createElement(panel.ParticipantProgressDetail, { data: { ...data, summary: { ...summary, finalCompleted: true } } }));
  assert.match(final, /Nilai total hasil akhir/);
});

test("legacy teacher workspace redirects administrators to progress and does not bypass admin guard", async () => {
  const calls = [];
  const legacy = load("modules/academy/pages/pengajar/layout.tsx", {
    "next/navigation": { redirect: path => { calls.push(path); } },
    "../../api/admin-access": { requireAcademyAdmin: async () => calls.push("guard") },
  });
  await legacy.default();
  assert.deepEqual(calls, ["guard", "/admin/academy/progres"]);
});

test("admin progress API uses scoped protected reads and maps only genuine missing details to null", async () => {
  const calls = []; let status = 0;
  class ApiError extends Error { constructor(status) { super("API failure"); this.status = status; } }
  const api = load("modules/academy/api/admin-progress.ts", { "server-only": {}, "@/lib/api": {
    ApiError, apiRequest: async path => { calls.push(path); if (status) throw new ApiError(status); return { ok: true }; },
  } });
  await api.getAdminProgress(new URLSearchParams({ cohort: "c1", q: "PAZ003" }));
  await api.getAdminProgressDetail("p/id", "c&id");
  assert.equal(calls[0], "academy/admin/progress?cohort=c1&q=PAZ003");
  assert.equal(calls[1], "academy/admin/progress/p%2Fid?cohort=c%26id");
  status = 404; assert.equal(await api.getAdminProgressDetail("missing", "c1"), null);
  status = 403; await assert.rejects(() => api.getAdminProgressDetail("p3", "c1"), /API failure/);
});
