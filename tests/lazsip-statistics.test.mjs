import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const statistics = { totalDana: 123456, totalDonatur: 7, totalPenerima: 9, totalMitra: 3 };
const dependencies = {
  '@/lib/organization-contact': {ORGANIZATION_CONTACT:{}},
  'next/link': {default:'Link'},
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

dependencies['@/modules/lazsip/api/siteContentDefaults'] = load('modules/lazsip/api/siteContentDefaults.ts');

test('public service cards replace financial counters while about statistics remain unchanged', async () => {
  const transparency = await load('modules/lazsip/components/sections/TransparansiSection.tsx').TransparansiSection();
  assert.equal(find(transparency, 'StatCounter').length, 0);
  assert.deepEqual(find(transparency, 'Link').map(link=>link.href), ['/lazsip/donasi','/lazsip/zakat','/lazsip/penyaluran-bantuan']);
  const about = await load('modules/lazsip/components/sections/TentangSection.tsx').TentangSection();
  assert.deepEqual(find(about, 'StatCounter').map(stat => stat.value), ['2015', '999', '3']);
});

test('general content allows manual verifier count while other statistics stay automatic', async () => {
  const page = await load('modules/lazsip/admin/pages/konten/page.tsx').default();
  const sections = find(page, 'KontenUmumTabs')[0].sections;
  assert.equal(sections.some(section => section.sectionKey === 'transparansi'), true);
  const fieldKeys = sections.flatMap(section => section.fields.map(field => field.key));
  for (const key of Object.keys(statistics)) assert.equal(fieldKeys.includes(key), false);
  assert.equal(sections.find(section => section.sectionKey === 'tentang').fields.some(field => field.key === 'totalVerifikator'), true);
});

test('admin service content controls visibility, text and safe destinations', async () => {
  const original = dependencies['@/modules/lazsip/api/siteContent'].getSiteContent;
  try {
    dependencies['@/modules/lazsip/api/siteContent'].getSiteContent = async () => ({title:'Layanan pilihan',card1Href:'javascript:alert(1)',card2Visible:'false'});
    const tree = await load('modules/lazsip/components/sections/TransparansiSection.tsx').TransparansiSection();
    assert.equal(find(tree,'h2')[0].children, 'Layanan pilihan');
    assert.deepEqual(find(tree,'Link').map(link=>link.href), ['/lazsip','/lazsip/penyaluran-bantuan']);
    dependencies['@/modules/lazsip/api/siteContent'].getSiteContent = async () => ({visible:'false'});
    assert.equal(await load('modules/lazsip/components/sections/TransparansiSection.tsx').TransparansiSection(), null);
  } finally { dependencies['@/modules/lazsip/api/siteContent'].getSiteContent = original; }
});
