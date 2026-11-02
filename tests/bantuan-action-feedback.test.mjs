import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url), ts = require('typescript');
const root = path.resolve('modules/bantuan/components/ActionPanel.tsx');
function target(extra = {}) {
  const calls = [];
  return { calls, scrollIntoView: options => calls.push(['scroll', options]), focus: options => calls.push(['focus', options]), ...extra };
}
function control(name, extra = {}) {
  return target({ tagName: 'INPUT', name, id: name, type: 'text', willValidate: true, validity: { valid: true }, getAttribute: () => null, ...extra });
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree || typeof tree !== 'object') return '';
  return Array.isArray(tree) ? tree.map(text).join('') : text(tree.props?.children);
}

function mount({ status = 'review1', role = 'approver', values = {}, controls = [], request, detail = {} } = {}) {
  const hooks = [], effects = [], frames = new Map(), cache = new Map(), requests = [];
  let cursor = 0, frameId = 0, tree;
  const form = { elements: controls, values, reset() { this.values = {}; } }, region = target(), summary = target();
  const react = {
    ...require('react'),
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof value === 'function' ? value() : value; return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
    useCallback: fn => fn,
    useEffect(fn, deps) { const i = cursor++, old = hooks[i]; if (!old || deps.some((d, n) => d !== old.deps[n])) { old?.cleanup?.(); hooks[i] = { deps }; effects.push(() => { hooks[i].cleanup = fn(); }); } },
  };
  function load(file) {
    const full = path.resolve(file);
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module);
    const localRequire = id => {
      if (id === 'react' && full === root) return react;
      if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      if (id === 'next/navigation') return { useRouter: () => ({ replace() {}, push() {} }) };
      if (id === 'next/link') return { __esModule: true, default: () => null };
      if (id.startsWith('.') || id.startsWith('@/')) {
        const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(full), id);
        const resolved = [base, base + '.ts', base + '.tsx'].find(existsSync);
        const exports = load(resolved);
        if (resolved.endsWith(path.join('api', 'client.ts'))) return { ...exports, request: async (...args) => { requests.push(args); return request?.(...args); } };
        return exports;
      }
      return require(id);
    };
    const compiled = ts.transpileModule(readFileSync(full, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(compiled, {
      module, exports: module.exports, require: localRequire, crypto: require('node:crypto').webcrypto, URLSearchParams, Error,
      requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: id => frames.delete(id),
      FormData: class extends Map { constructor(element) { super(Object.entries(element.values)); } },
    }, { filename: full });
    return module.exports;
  }
  const { ActionPanel } = load(root);
  const viewer = { id: 'actor', name: 'Petugas', role, settings: { minimumSurveyPhotos: 5 } };
  const row = { id: 'aid', number: 'BNT-TEST', name: 'Pemohon Contoh', program: 'Kebutuhan Pokok', status, source: 'online', createdBy: 'cc', verifierId: 'actor', distributorId: 'actor', distributionType: 'verifier', version: 7, applicant: {}, documents: [] };
  if (role === 'approver') row.verifierId = 'other';
  Object.assign(row,detail);
  function render() {
    cursor = 0; tree = ActionPanel({ viewer, row, staff: [], reload() {} });
    for (const node of nodes(tree)) {
      if (!node.props?.ref) continue;
      node.props.ref.current = node.type === 'form' ? form : node.props.role === 'alert' ? summary : region;
    }
    effects.splice(0).forEach(fn => fn());
    return tree;
  }
  function flush() { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } }
  const find = predicate => nodes(tree).find(predicate);
  const actionForm = () => find(n => n.type === 'form' && n.props.id);
  function click(label) {
    const button = find(n => n.type === 'button' && text(n).startsWith(label));
    assert.ok(button, 'Missing button: ' + label);
    const trigger = target(); button.props.onClick({ currentTarget: trigger }); render(); flush(); return trigger;
  }
  render();
  return { render, flush, find, actionForm, click, form, region, summary, requests, load, get tree() { return tree; }, submit: () => actionForm().props.onSubmit({ preventDefault() {}, currentTarget: form }) };
}

test('actions stay visible and only an explicit click reveals and scrolls to the inline form', () => {
  const app = mount();
  assert.equal(app.actionForm(), undefined);
  assert.equal(app.region.calls.length, 0);
  app.click('Setujui untuk survei');
  assert.ok(app.actionForm());
  assert.equal(app.find(n => n.type === 'dialog'), undefined);
  assert.match(text(app.tree), /Ya, setujui untuk survei/);
  assert.equal(app.region.calls[0][1].behavior, 'smooth');
  assert.equal(app.region.calls[0][1].block, 'start');
  assert.equal(app.region.calls[1][0], 'focus');
  assert.equal(app.requests.length, 0);
  const trigger = app.find(n => n.type === 'button' && n.props['aria-expanded'] === true);
  assert.equal(trigger.props['aria-controls'], app.find(n => n.type === 'section' && n.props.tabIndex === -1).props.id);
  app.click('Setujui untuk survei');
  assert.equal(app.region.calls.filter(c => c[0] === 'scroll').length, 2);
});

test('missing action fields stop submission and scroll focus to the field without discarding the form', async () => {
  const reason = control('reason', { tagName: 'TEXTAREA', validity: { valid: false, valueMissing: true } });
  const app = mount({ controls: [reason] });
  app.click('Tolak pengajuan'); await app.submit(); app.render(); app.flush();
  assert.equal(app.requests.length, 0);
  assert.match(text(app.tree), /Kolom ini wajib diisi/);
  assert.equal(reason.calls[0][1].block, 'center');
  assert.equal(reason.calls[1][0], 'focus');
  assert.ok(app.actionForm());
});

test('confirmation sends one versioned mutation even when submit is clicked twice', async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const app = mount({ request: () => pending });
  app.click('Setujui untuk survei');
  const first = app.submit(); await app.submit(); app.render();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0][0], 'applications/aid/actions/review1_approve');
  assert.equal(JSON.parse(app.requests[0][1].body).version, 7);
  assert.equal(app.find(n => n.type === 'button' && n.props.type === 'submit' && text(n).includes('Menyimpan')).props.disabled, true);
  finish(); await first; app.render();
  assert.equal(app.tree.type.name, 'ProcessSuccess');
});

test('distributor assignment scrolls to its selection, explains missing staff, and saves only after selection', async () => {
  const staff = control('distributorId', { tagName: 'SELECT', validity: { valid: false, valueMissing: true } });
  const app = mount({ status: 'approved', role: 'call_center', controls: [staff] });
  app.click('Tentukan / ganti penyalur');
  assert.equal(app.region.calls[0][1].block, 'start');
  await app.submit(); app.render(); app.flush();
  assert.equal(app.requests.length, 0);
  assert.match(text(app.tree), /Penyalur: Kolom ini wajib diisi/);
  assert.equal(staff.calls.at(-1)[0], 'focus');
  staff.validity = { valid: true };
  app.form.values = { distributionType: 'verifier', distributorId: 'suparta' };
  await app.submit(); app.render();
  assert.equal(app.requests[0][0], 'applications/aid/actions/assign_distributor');
  assert.equal(JSON.parse(app.requests[0][1].body).distributorId, 'suparta');
  assert.equal(app.tree.type.name, 'ProcessSuccess');
});

test('server validation keeps the selected action and entered values available for correction and retry', async () => {
  let app, failed = true;
  const reason = control('reason', { tagName: 'TEXTAREA' });
  app = mount({ values: { reason: 'Data perlu diperiksa' }, controls: [reason], request: () => {
    if (failed) { const { RequestError } = app.load('modules/bantuan/api/client.ts'); throw new RequestError('Periksa alasan ini.', 422, { reason: ['Alasan belum sesuai.'] }); }
  } });
  app.click('Tolak pengajuan'); await app.submit(); app.render(); app.flush();
  assert.match(text(app.tree), /Alasan belum sesuai/);
  assert.equal(app.form.values.reason, 'Data perlu diperiksa');
  assert.equal(reason.calls.at(-1)[0], 'focus');
  failed = false; await app.submit(); app.render();
  assert.equal(app.requests.length, 2);
  assert.equal(app.tree.type.name, 'ProcessSuccess');
});

test('cancel editing returns to the original action button without changing the application', () => {
  const app = mount(), trigger = app.click('Setujui untuk survei');
  app.click('Batal mengisi');
  assert.equal(app.actionForm(), undefined);
  assert.equal(trigger.calls[0][1].block, 'nearest');
  assert.equal(trigger.calls[1][0], 'focus');
  assert.equal(app.requests.length, 0);
});

test('survey entry opens only on click and incomplete survey can be saved as draft but not submitted', async () => {
  const app = mount({ status: 'survey_assigned', role: 'verifier' });
  assert.equal(app.actionForm(), undefined);
  app.click('Isi / lanjutkan survei'); await app.submit(); app.render(); app.flush();
  assert.equal(app.requests.length, 0);
  assert.match(text(app.tree), /Lengkapi atau perbaiki kolom/);
  const draft = app.find(n => n.type === 'button' && text(n) === 'Simpan draft survei');
  draft.props.onClick(); await new Promise(resolve => setImmediate(resolve)); app.render();
  assert.equal(app.requests[0][0], 'applications/aid/actions/survey_save');
  assert.ok(JSON.parse(app.requests[0][1].body).survey.date);
  assert.equal(app.tree.type.name, 'ProcessSuccess');
});

test('field targeting skips hidden currency payloads, supports survey choices, and respects reduced motion', () => {
  const app = mount(), { actionControl, focusActionProblem, revealActionTarget } = app.load('modules/bantuan/action-feedback.ts');
  const hidden = control('amount', { type: 'hidden' });
  const amount = control('', { getAttribute: key => key === 'data-validation-key' ? 'amount' : null });
  const choice = control('', { id: 'survey-hasSktm-0', tagName: 'BUTTON', getAttribute: key => key === 'role' ? 'radio' : null });
  const form = { elements: [hidden, amount, choice] };
  assert.equal(actionControl(form, 'amount'), amount);
  assert.equal(actionControl(form, 'survey.hasSktm'), choice);
  focusActionProblem(form, { 'survey.hasSktm': ['Pilih jawaban.'] }, null);
  assert.equal(choice.calls.at(-1)[0], 'focus');
  const reduced = target({ ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } } });
  revealActionTarget(reduced);
  assert.equal(reduced.calls[0][1].behavior, 'instant');
  const summary = target(); focusActionProblem(form, { version: ['Data sudah berubah.'] }, summary);
  assert.equal(summary.calls.at(-1)[0], 'focus');
});

test('Call Center corrects the original survey before forwarding without uploading replacement evidence', async () => {
  const survey={date:'2026-01-01',hasSktm:true,background:'Kondisi keluarga',currentCondition:'Perlu bantuan',needs:'Kebutuhan pokok',efforts:'Mencari pekerjaan',homeObservation:'Rumah sederhana',stayDuration:3,stayUnit:'tahun',socialRecord:'Baik',recommendation:'layak',contacts:[]};
  const app=mount({status:'survey_cc_review',role:'call_center',detail:{survey,verifierId:'other-verifier'}});
  app.click('Review & kirim hasil ke Approver');
  const fields=app.find(node=>node.type?.name==='Fields'&&node.props.prefix==='survey-');
  assert.ok(fields);
  fields.props.set('needs','Biaya sekolah yang sudah dikoreksi'); app.render();
  await app.submit(); app.render();
  assert.equal(app.requests[0][0],'applications/aid/actions/survey_review_submit');
  assert.equal(JSON.parse(app.requests[0][1].body).survey.needs,'Biaya sekolah yang sudah dikoreksi');
  assert.equal(app.tree.type.name,'ProcessSuccess');
});

test('verifier decline requires a reason and sends only the decline action', async()=>{
  const reason=control('reason',{tagName:'TEXTAREA',validity:{valid:false,valueMissing:true}});
  const app=mount({status:'survey_assigned',role:'verifier',controls:[reason]});
  app.click('Tolak tugas survei'); await app.submit(); app.render(); app.flush();
  assert.equal(app.requests.length,0);
  reason.validity={valid:true}; app.form.values={reason:'Lokasi terlalu jauh untuk jadwal ini.'};
  await app.submit();
  assert.equal(app.requests[0][0],'applications/aid/actions/survey_decline');
  assert.equal(JSON.parse(app.requests[0][1].body).reason,'Lokasi terlalu jauh untuk jadwal ini.');
});
