import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const now = new Date('2026-11-18T10:00:00Z');
const task = { id: 'task-1', title: 'Bacaan pekanan', type: 'voice_note', teacher: { id: 'pic-1', name: 'PIC Satu', code: 'GTQ1' }, groups: [{ id: 'g1', name: 'Kelompok Satu', code: 'TQ1' }], description: 'Baca perlahan', deadline: now, questions: [] };
const meta = { total: 26, current_page: 1, last_page: 2, per_page: 25 };
const summary = { participants: 2, submitted: 1, missing: 1, pending: 0, approved: 1, rejected: 0 };
const sent = { id: 'sub-1', status: 'approved', score: 0, attemptsCount: 2, isLate: true, submittedAt: now };
const params = { group: 'g1', status: 'approved', q: 'Nama & kode' };
function harness({ deny = false, fail = null } = {}) {
  let calls = 0;
  const mod = { exports: {} };
  const query = (params, keys = ['group', 'teacher', 'type', 'q', 'status', 'page']) => new URLSearchParams(keys.filter(k => typeof params[k] === 'string' && params[k]).map(k => [k, params[k]]));
  class ApiError extends Error { constructor(status) { super('api error'); this.status = status; } }
  const execute = value => async () => { calls++; if (fail) throw new ApiError(fail); return value; };
  const ui = Object.fromEntries(['Card', 'SubmissionPill', 'TypePill', 'LatePill'].map(key => [key, ({ children, status }) => React.createElement('div', null, children ?? status ?? key)]));
  Object.assign(ui, { inputClass: 'input', Button: ({ children }) => React.createElement('button', null, children), ButtonLink: ({ children, href }) => React.createElement('a', { href }, children), Stat: ({ label, value }) => React.createElement('div', null, label, ': ', value), ScoreBadge: ({ score }) => React.createElement('span', null, `Nilai ${score}`), formatDateTime: () => '18 Nov 2026 WIB' });
  const mocks = {
    'next/link': { default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) },
    'next/navigation': { notFound() { throw Error('NOT_FOUND'); } },
    '@/lib/api': { ApiError }, '../../api/access': { requireTanwirAdmin: async () => { if (deny) throw Error('DENIED'); } },
    '../../api/task-recaps': { recapQuery: query,
      getTaskRecaps: execute({ tasks: [{ ...task, counts: summary }], groups: task.groups, teachers: [task.teacher], meta }),
      getTaskRecap: execute({ task, summary, groups: task.groups, meta, participants: [{ id: 'p1', code: 'PTQ1', name: 'Nama Peserta', active: true, group: task.groups[0], currentlyAssigned: false, submission: sent }, { id: 'p2', code: 'PTQ2', name: 'Belum kirim', active: false, group: task.groups[0], currentlyAssigned: true, submission: null }] }),
      getSubmissionRecap: execute({ ...sent, task, student: { name: 'Nama Peserta', code: 'PTQ1', group: null }, files: [{ index: 0, name: 'Rekaman lama', mime: 'audio/wav', size: 15 }], fileMime: 'audio/wav', answers: [], logs: [] }),
    },
    '../../api/policy': { TASK_TYPE_LABEL: { voice_note: 'Suara', quiz: 'Kuis' } }, '../ui': ui,
    '../app/QuizReview': { QuizReview: () => React.createElement('div', null, 'Jawaban kuis') },
    '../app/ReviewHistory': { ReviewHistory: () => React.createElement('div', null, 'Riwayat lama') },
    './TaskRecap.module.css': { default: {} },
    './TaskRecapExport': { TaskRecapExport: () => React.createElement('button', null, 'Unduh semua progres (Excel)') },
  };
  const media = { exports: {} };
  vm.runInNewContext(compile('modules/tanwir/components/app/SubmissionMedia.tsx'), { exports: media.exports, require: id => id === './media' ? { submissionFileUrl: (id, index) => `/api/tanwir/files/submission/${id}?index=${index}` } : require(id) });
  mocks['../app/SubmissionMedia'] = media.exports;
  vm.runInNewContext(compile('modules/tanwir/components/admin/TaskRecapPages.tsx'), { exports: mod.exports, URLSearchParams, Object, require: id => mocks[id] ?? require(id) });
  return { pages: mod.exports, calls: () => calls };
}
test('recap exposes filters and keeps group, status and search through pagination and result links', async () => {
  const { pages } = harness();
  const list = renderToStaticMarkup(await pages.TaskRecapIndexPage({ params }));
  assert.match(list, /Unduh semua progres/); assert.match(list, /PIC pembuat tugas/); assert.match(list, /Kelompok tujuan/); assert.match(list, /Lihat rincian/);
  const detail = renderToStaticMarkup(await pages.TaskRecapDetailPage({ id: 'task-1', params }));
  assert.match(detail, /Nilai 0/); assert.match(detail, /Belum mengumpulkan/); assert.match(detail, /Di luar sasaran saat ini/); assert.match(detail, /Nonaktif/);
  assert.match(detail, /hasil\/sub-1\?group=g1&amp;q=Nama\+%26\+kode&amp;status=approved/);
  assert.match(detail, /page=2/); assert(!detail.includes('method="post"')); assert(!detail.includes('Hapus tugas'));
});
test('admin result page plays legacy files through the private endpoint and preserves zero scores and return filters', async () => {
  const { pages } = harness();
  const html = renderToStaticMarkup(await pages.TaskSubmissionRecapPage({ id: 'sub-1', params }));
  assert.match(html, /<audio/); assert.match(html, /\/api\/tanwir\/files\/submission\/sub-1\?index=0/);
  assert.match(html, /Nilai 0/); assert.match(html, /Riwayat lama/); assert.match(html, /status=approved/);
  assert(!html.includes('Setujui')); assert(!html.includes('Tolak')); assert(!html.includes('filePath'));
});
test('private recap loaders run only after the admin guard and distinguish invalid filters from backend failures', async () => {
  const denied = harness({ deny: true });
  for (const page of Object.values(denied.pages)) await assert.rejects(page({ id: 'task-1', params }), /DENIED/);
  assert.equal(denied.calls(), 0);
  const invalid = harness({ fail: 422 });
  assert.match(renderToStaticMarkup(await invalid.pages.TaskRecapIndexPage({ params })), /Reset filter/);
  await assert.rejects(harness({ fail: 404 }).pages.TaskRecapDetailPage({ id: 'missing', params }), /NOT_FOUND/);
  await assert.rejects(harness({ fail: 503 }).pages.TaskRecapIndexPage({ params }), /api error/);
});
