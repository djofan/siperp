import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(read('modules/teknisi/api/policy.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, FormData });

test('frontend transitions match Laravel TeknisiContext exactly', () => {
  const source = read('api/app/Modules/Teknisi/Services/TeknisiContext.php').split('public const TRANSITIONS = [')[1].split('public function actor')[0];
  const transitions = [...source.matchAll(/'([a-z_]+)'\s*=>\s*\[([^\]]*)\]/g)];
  assert.equal(transitions.length, 8);
  for (const [, status, targets] of transitions) {
    const expected = [...targets.matchAll(/'([a-z_]+)'/g)].map(match => match[1]);
    assert.deepEqual(Array.from(exports.nextStatuses(status)), expected);
    assert.ok(exports.isStatus(status));
  }
  assert.equal(exports.canTransition('received', 'repairing'), false);
  assert.equal(exports.canTransition('received', 'diagnosis'), true);
  assert.equal(exports.canTransition('ready', 'collected'), true);
  assert.equal(exports.canTransition('collected', 'repairing'), false);
});

test('status form forwards concurrency guards and respects backend manager restriction', () => {
  const form = read('modules/teknisi/components/operations/workflow-form.tsx');
  assert.match(form, /name="expectedStatus" value=\{ticket.status\}/);
  assert.match(form, /name="expectedVersion" value=\{ticket.updatedAt.toISOString\(\)\}/);
  assert.match(form, /user.canManage\|\|status!=="collected"/);
  assert.match(form, /confirmMessage=/);
  const actions = read('modules/teknisi/api/ui-actions.ts');
  assert.match(actions, /requireTechnicianUser/);
  assert.match(actions, /apiRequest\("teknisi\/tickets\/update"/);
  assert.match(actions, /if\(!user.canWrite\)/);
  assert.match(actions, /if\(!user.canManage\)/);
});

test('navigation targets real frontend pages and does not advertise unsupported financial features', () => {
  for (const path of ['app/admin/teknisi/outlet/baru/page.tsx','app/admin/teknisi/teknisi/baru/page.tsx','app/admin/teknisi/laporan/page.tsx','app/(public)/teknisi/panel/laporan/page.tsx','app/admin/teknisi/tiket/[id]/[operation]/page.tsx','app/(public)/teknisi/panel/tiket/[id]/[operation]/page.tsx']) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  const dashboard = read('modules/teknisi/components/operations/dashboard.tsx');
  assert.match(dashboard, /monitoring\(user,filters.outlet\)/);
  assert.doesNotMatch(dashboard, /prisma|paidAmount|capitalCost|Math.random/);
  assert.doesNotMatch(read('modules/teknisi/components/RecentActivity.tsx'), /Pembayaran diterima/);
  assert.match(read('modules/teknisi/pages/operator/layout.tsx'), /row.id===user.technician.outletId/);
});

test('frontend validation still bounds amounts and protects CSV cells', () => {
  for (const value of ['-1','1.5','','1000000001']) { const data = new FormData(); data.set('amount',value); assert.throws(() => exports.integer(data,'amount')); }
  for (const value of ['=1','  +1','@SUM(A1)','-1']) assert.ok(exports.csvCell(value).startsWith('"\''));
});
