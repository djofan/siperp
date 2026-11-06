import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import { academyLoginDestination } from '../modules/academy/api/auth-navigation.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const participant = { isSuperadmin: false, isTeacher: false, moduleAccess: [], academyProfile: { mustChangePassword: false } };

test('Academy admin and superadmin reach management even during maintenance', () => {
  for (const available of [true, false]) {
    assert.equal(academyLoginDestination({ ...participant, moduleAccess: [{ role: 'admin' }] }, available), '/admin/academy');
    assert.equal(academyLoginDestination({ ...participant, isSuperadmin: true }, available), '/admin/academy');
  }
});

test('Academy navigation preserves participant, teacher, first-password and guest restrictions', () => {
  assert.equal(academyLoginDestination(null, true), '/academy/masuk');
  assert.equal(academyLoginDestination(participant, true), '/academy/belajar');
  assert.equal(academyLoginDestination({ ...participant, isTeacher: true }, true), '/academy/pengajar');
  assert.equal(academyLoginDestination(participant, false), '/academy');
  assert.equal(academyLoginDestination({ ...participant, academyProfile: { mustChangePassword: true } }, true), '/academy/akun');
  assert.equal(academyLoginDestination({ ...participant, moduleAccess: [{ role: 'editor' }] }, true), '/academy/belajar');
});

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

test('registration retains all non-secret fields after an action error and allows correction', async () => {
  let lastSubmission;
  const action = async (_, data) => {
    lastSubmission = data;
    return { error: 'Konfirmasi password tidak cocok.' };
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync('modules/academy/components/RegistrationForm.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(id) {
      if (id === '../api/actions') return { registerParticipant: action };
      if (id === './ActionForm') return { ActionForm: 'form' };
      if (id === './ui') return { inputClass: '' };
      if (id === './ui/PasswordField') return { PasswordField: 'input' };
      return require(id);
    },
  });
  const render = () => exports.RegistrationForm({ cohortTitle: 'Angkatan QA' });
  const find = name => nodes(render()).find(node => node.props?.name === name);
  const entered = { name: 'Peserta QA', email: 'learner@example.test', address: 'Alamat QA', phone: '080000000000', gender: 'IKHWAN' };
  const fields = Object.fromEntries(Object.entries(entered).map(([name, value]) => [name, { value }]));
  const passwords = [{ name: 'password', type: 'text', value: 'test-password' }, { name: 'confirmPassword', type: 'password', value: 'different-password' }];
  const submitted = new FormData();
  for (const [name, value] of Object.entries(entered)) submitted.set(name, value);
  submitted.set('password', 'test-password');
  submitted.set('confirmPassword', 'different-password');
  const result = await render().props.action({ error: '' }, submitted);
  assert.ok(result.error);
  let prevented = false;
  render().props.onReset({ preventDefault() { prevented = true; }, currentTarget: { querySelectorAll() { return passwords; } } });
  // Native form.reset() only resets the form if the reset event is not cancelled.
  if (!prevented) for (const field of Object.values(fields)) field.value = '';
  for (const [name, value] of Object.entries(entered)) assert.equal(fields[name].value, value, name);
  fields.email.value = 'corrected@example.test';
  assert.equal(fields.email.value, 'corrected@example.test');
  assert.equal(lastSubmission.get('password'), 'test-password');
  assert.equal(find('password').props.value, undefined);
  assert.equal(find('confirmPassword').props.value, undefined);
  assert.equal(passwords[0].value, '');
  assert.equal(passwords[1].value, '');
});
