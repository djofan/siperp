import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../modules/lazsip/components/admin/SiteContentSectionForm.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

async function submit(fetch) {
  const state = [];
  let refreshes = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(code, {
    exports, fetch, Error,
    require(name) {
      if (name === 'react') return {
        useState(initial) {
          const index = state.length;
          state.push(typeof initial === 'function' ? initial() : initial);
          return [state[index], value => { state[index] = value; }];
        },
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'next/navigation') return { useRouter: () => ({ refresh: () => { refreshes++; } }) };
      return { panelClasses: () => '' };
    },
  });
  const form = exports.SiteContentSectionForm({ sectionKey: 'kontak', title: 'Kontak', fields: [], initialValue: {} });
  await form.props.onSubmit({ preventDefault() {} });
  return { loading: state[1], success: state[2], error: state[3], refreshes };
}

test('contact form confirms only a successful save', async () => {
  const result = await submit(async () => ({ ok: true }));
  assert.deepEqual(result, { loading: false, success: true, error: null, refreshes: 1 });
});

test('contact form shows validation failures without reporting success', async () => {
  const result = await submit(async () => ({ ok: false, json: async () => ({ error: { details: { 'content.email': ['Email tidak valid.'] } } }) }));
  assert.deepEqual(result, { loading: false, success: false, error: 'Email tidak valid.', refreshes: 0 });
});

test('contact form recovers from connection failures and non-JSON errors', async () => {
  for (const fetch of [
    async () => { throw new Error('Koneksi terputus.'); },
    async () => ({ ok: false, json: async () => { throw new Error('HTML response'); } }),
  ]) {
    const result = await submit(fetch);
    assert.equal(result.loading, false);
    assert.equal(result.success, false);
    assert.equal(result.refreshes, 0);
    assert.ok(result.error);
  }
});
