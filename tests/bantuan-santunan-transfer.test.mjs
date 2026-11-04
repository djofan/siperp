import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const context = { exports: {}, Error };
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/santunan-transfer.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const { selectedPendingSantunan, transferSantunanSelection } = context.exports;
const row = (id, transferStatus = 'pending') => ({ id, transferStatus, version: 3 });

test('selection excludes hidden records and recipients already transferred after refresh', () => {
  const result = selectedPendingSantunan([row('a'), row('b', 'transferred'), row('c')], ['a', 'b', 'hidden']);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'a');
});

test('transfers each selected pending recipient once and excludes completed transfers', async () => {
  const sent = [];
  const result = await transferSantunanSelection([row('a'), row('b', 'transferred'), row('c')], async item => {
    sent.push([item.id, item.version]);
  });
  assert.equal(result.completed, 2);
  assert.equal(result.error, undefined);
  assert.deepEqual(sent, [['a', 3], ['c', 3]]);
});

test('stops after a conflict and reports partial completion without retrying successful recipients', async () => {
  const sent = [];
  const result = await transferSantunanSelection([row('a'), row('b'), row('c')], async item => {
    sent.push(item.id);
    if (item.id === 'b') throw new Error('Data telah berubah.');
  });
  assert.equal(result.completed, 1);
  assert.equal(result.error, 'Data telah berubah.');
  assert.deepEqual(sent, ['a', 'b']);
});
