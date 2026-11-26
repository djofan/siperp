import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const nativeRequire=createRequire(import.meta.url);

const brand = { DEFAULT_HERO_IMAGE: '/aid/gempa-ntt.jpg', SARSIP_LOGO: '/sarsip-logo.png' };
const photo = '/uploads/sarsip/12345678-1234-1234-1234-123456789012.webp';
const flush = () => new Promise(setImmediate);

function component(path, name, extras = {}) {
  const state = [];
  let cursor = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, Error, FormData, URL: { createObjectURL: () => 'blob:preview', revokeObjectURL() {} },
    ...extras,
    require: name => name === "@/lib/number-format" ? nativeRequire(name) : ({
      react: hooks,
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/image': { default: 'Image' },
      'next/link': { default: 'Link' },
      'next/navigation': { useRouter: () => ({ refresh() {} }) },
      '@/modules/sarsip/brand': brand,
      './Landing.module.css': { default: new Proxy({}, { get: (_, name) => name }) },
      './Admin.module.css': { default: new Proxy({}, { get: (_, name) => name }) },
      '@/modules/sarsip/api/data': { money: value => `Rp ${value}` },
      '@/modules/sarsip/components/admin/HeroImageField': { HeroImageField: 'HeroImageField' },
    })[name] ?? {},
  });
  return props => { cursor = 0; return exports[name](props); };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, predicate));
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
}

test('centered hero keeps admin headline and photo with public assistance information', () => {
  const render = component('modules/sarsip/components/Hero.tsx', 'SarsipHero');
  const props = { profile: { headline: 'Tim SARSIP', heroImage: photo }, stats: { totalAmount: 15000, donorCount: 2, beneficiaryCount: 7 }, campaignCount: 3 };
  const tree = render(props);
  assert.equal(find(tree, node => node.type === 'h1')[0].props.children, 'Tim SARSIP');
  const image = find(tree, node => node.type === 'Image')[0];
  assert.equal(image.props.src, photo);
  assert.equal(image.props.preload, true);
  assert.equal(find(tree, node => node.type === 'strong').length, 0);
  assert.ok(find(tree, node => node.type === 'h2').some(node => node.props.children === 'Pencarian & pertolongan'));
  assert.equal(find(render({ ...props, profile: { ...props.profile, heroImage: null } }), node => node.type === 'Image').length, 0);
});

test('photo upload reports progress and preserves the saved photo after an API failure', async () => {
  let resolveUpload;
  const progress = [];
  const changed = [];
  const render = component('modules/sarsip/components/admin/HeroImageField.tsx', 'HeroImageField', {
    fetch: () => new Promise(resolve => { resolveUpload = resolve; }),
  });
  const props = { value: photo, disabled: false, onChange: value => changed.push(value), onUploadingChange: value => progress.push(value) };
  const fileInput = () => find(render(props), node => node.type === 'input')[0];
  fileInput().props.onChange({ target: { files: [new File(['photo'], 'hero.png', { type: 'image/png' })], value: '' } });
  assert.equal(fileInput().props.disabled, true);
  assert.deepEqual(progress, [true]);
  resolveUpload({ ok: false, json: async () => ({ error: { message: 'Upload ditolak.' } }) });
  await flush();
  assert.deepEqual(progress, [true, false]);
  assert.deepEqual(changed, []);
  assert.equal(fileInput().props.disabled, false);
  const tree = render(props);
  assert.equal(find(tree, node => node.type === 'Image')[0].props.src, photo);
  assert.equal(find(tree, node => node.props?.role === 'alert')[0].props.children, 'Upload ditolak.');
});

test('photo upload accepts an image URL, validates file size, and supports clearing', async () => {
  const changed = [];
  let requests = 0;
  const render = component('modules/sarsip/components/admin/HeroImageField.tsx', 'HeroImageField', {
    fetch: async () => { requests++; return { ok: true, json: async () => ({ url: photo }) }; },
  });
  const props = { value: photo, disabled: false, onChange: value => changed.push(value), onUploadingChange() {} };
  const select = file => find(render(props), node => node.type === 'input')[0].props.onChange({ target: { files: [file], value: '' } });
  select(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }));
  assert.equal(requests, 0);
  select(new File(['photo'], 'hero.jpg', { type: 'image/jpeg' }));
  await flush();
  assert.deepEqual(changed, [photo]);
  find(render(props), node => node.type === 'button')[0].props.onClick();
  assert.deepEqual(changed, [photo, null]);
});

test('profile cannot submit during upload and sends the selected hero image when saved', async () => {
  const requests = [];
  class Form {
    constructor() { this.data = [['headline', 'Tim SARSIP'], ['description', 'Tentang tim'], ['contact', '']]; }
    [Symbol.iterator]() { return this.data[Symbol.iterator](); }
  }
  const render = component('modules/sarsip/components/admin/ProfileEditor.tsx', 'ProfileEditor', {
    FormData: Form,
    fetch: async (url, options) => { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: true }) }; },
  });
  const props = { profile: { id: 'main', headline: 'Tim SARSIP', description: 'Tentang tim', contact: null, heroImage: null } };
  const event = { preventDefault() {}, currentTarget: {} };
  find(render(props), node => node.type === 'HeroImageField')[0].props.onUploadingChange(true);
  await render(props).props.onSubmit(event);
  assert.equal(requests.length, 0);
  let field = find(render(props), node => node.type === 'HeroImageField')[0];
  field.props.onChange(photo);
  field.props.onUploadingChange(false);
  await render(props).props.onSubmit(event);
  assert.equal(requests[0].heroImage, photo);
  assert.equal(find(render(props), node => node.props?.role === 'status').length, 1);
});
