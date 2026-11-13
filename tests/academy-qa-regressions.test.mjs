import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import { academyLoginDestination } from '../modules/academy/api/auth-navigation.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const participant = { isSuperadmin: false, isTeacher: false, moduleAccess: [], academyProfile: { mustChangePassword: false } };

test('material list and editors highlight Materi instead of Dashboard', async () => {
  function compile(file, overrides) {
    const exports = {};
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(source, { exports, require: id => Object.hasOwn(overrides, id) ? overrides[id] : require(id) });
    return exports;
  }
  const Layout = compile('modules/academy/admin/pages/layout.tsx', {
    '@/modules/academy/api/admin-access': { requireAcademyAdmin: async () => ({ name: 'QA Admin' }) },
    '@/modules/academy/components/admin/AcademyAdminShellChrome': { AcademyAdminShellChrome: 'div' },
    '@/modules/academy/components/dashboard.css': {},
  }).default;
  const layout = await Layout({ children: 'Materi' });
  let pathname;
  const { DashboardChrome } = compile('modules/academy/components/DashboardChrome.tsx', {
    react: { useState: () => [false, () => {}] },
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => pathname },
    './ui/button': { Button: 'button' },
    './ui/badge': { Badge: 'span' },
    './ui/sheet': { Sheet: 'div', SheetContent: 'div', SheetTitle: 'h2', SheetDescription: 'p', SheetTrigger: 'div' },
    './ui/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    './LogoutButton': { LogoutButton: 'button' },
  });
  for (const suffix of ['', '/baru', '/qa-lesson']) {
    pathname = `/admin/academy/materi${suffix}`;
    const tree = DashboardChrome({ ...layout.props, role: 'Admin' });
    const links = nodes(tree).filter(node => node.type === 'a' && node.props['aria-current'] === 'page');
    assert.ok(links.length > 0, pathname);
    for (const link of links) assert.equal(link.props.href, '/admin/academy/materi', pathname);
    const header = nodes(tree).find(node => node.type === 'header');
    assert.ok(nodes(header).some(node => node.type === 'span' && node.props.children === 'Materi'), pathname);
  }
  pathname = '/admin/academy';
  const dashboard = DashboardChrome({ ...layout.props, role: 'Admin' });
  for (const link of nodes(dashboard).filter(node => node.type === 'a' && node.props['aria-current'] === 'page')) {
    assert.equal(link.props.href, '/admin/academy');
  }
});

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
