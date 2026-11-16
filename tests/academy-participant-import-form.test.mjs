import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
test('importing the next workbook never sends previous account passwords back to the server', async () => {
  let submit, forwarded;
  const previous = { error: '', result: { createdCount: 1, skippedCount: 0, credentials: [{ name: 'Synthetic', phone: '6281234567890', code: 'PAZQA1', password: 'FixtureOnlySecret' }] } };
  const source = readFileSync(new URL('../modules/academy/components/admin/ParticipantExcelImport.tsx', import.meta.url), 'utf8');
  const exports = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, { exports, require(id) {
    if (id === 'react') return {
      ...require('react'), useActionState(action) { submit = action; return [{ error: '' }, () => {}, false]; },
      useState: initial => [initial, () => {}], useRef: value => ({ current: value }),
    };
    if (id === '../../api/participant-import') return { importAcademyParticipants: async (state, form) => { forwarded = { state, form }; return { error: '' }; } };
    if (id.startsWith('@/') || id === './participant-workbook') return new Proxy({}, { get: () => () => null });
    if (id === 'next/link') return { __esModule: true, default: () => null };
    return require(id);
  } });
  exports.ParticipantExcelImport({ cohorts: [] });
  const form = new FormData();
  form.set('rows', '[]');
  await submit(previous, form);
  assert.equal(forwarded.form, form);
  assert.equal(forwarded.state.error, '');
  assert.equal(Object.keys(forwarded.state).length, 1);
  assert.equal(JSON.stringify(forwarded.state).includes('FixtureOnlySecret'), false);
});
