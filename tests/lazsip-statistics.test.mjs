import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const statistics = { totalDana: 123456, totalDonatur: 7, totalPenerima: 9, totalMitra: 3 };
const dependencies = {
  '@/modules/lazsip/api/statistics': { getLazsipStatistics: async () => statistics },
  '@/modules/lazsip/api/siteContent': { getSiteContent: async () => ({ totalDana: '999999', totalMitra: '999', totalVerifikator: '999' }) },
  '@/modules/lazsip/api/siteContentDefaults': { LAZSIP_SITE_CONTENT_DEFAULTS: { hero: {}, tentang: {}, legalitas: {}, kontak: {}, zakatFitrah: {} } },
  '@/modules/lazsip/api/beneficiaries': { listDistinctVerifierAreas: async () => [] },
  '@/modules/lazsip/components/format': { formatNumber: String, formatRupiah: String },
  '@/modules/lazsip/components/ui/StatCounter': { StatCounter: 'StatCounter' },
  '@/modules/lazsip/components/siteConfig': { lazsipSiteConfig: { foundedYear: 2015 } },
  '@/modules/lazsip/components/admin/KontenUmumTabs': { KontenUmumTabs: 'KontenUmumTabs' },
};

function load(path) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : (dependencies[name] ?? {}) });
  return exports;
}

function find(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type ? [node.props] : []), ...find(node.props?.children, type)];
}

test('public statistics use database aggregates while verifier count follows admin content', async () => {
  const transparency = await load('modules/lazsip/components/sections/TransparansiSection.tsx').TransparansiSection();
  assert.deepEqual(find(transparency, 'StatCounter').map(stat => stat.value), ['123456', '7', '9']);
  const about = await load('modules/lazsip/components/sections/TentangSection.tsx').TentangSection();
  assert.deepEqual(find(about, 'StatCounter').map(stat => stat.value), ['2015', '999', '3']);
});

test('general content allows manual verifier count while other statistics stay automatic', async () => {
  const page = await load('modules/lazsip/admin/pages/konten/page.tsx').default();
  const sections = find(page, 'KontenUmumTabs')[0].sections;
  assert.equal(sections.some(section => section.sectionKey === 'transparansi'), false);
  const fieldKeys = sections.flatMap(section => section.fields.map(field => field.key));
  for (const key of Object.keys(statistics)) assert.equal(fieldKeys.includes(key), false);
  assert.equal(sections.find(section => section.sectionKey === 'tentang').fields.some(field => field.key === 'totalVerifikator'), true);
});
