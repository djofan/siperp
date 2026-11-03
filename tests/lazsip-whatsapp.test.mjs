import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : (dependencies[name] ?? {}),
  });
  return exports;
}

const contact = load('modules/lazsip/api/contact.ts');

test('WhatsApp numbers accept local and international formats and reject invalid values', () => {
  for (const phone of ['0812 3456-7890', '+62 (812) 3456-7890', '6281234567890', '81234567890', '006281234567890']) {
    assert.equal(contact.getWhatsAppNumber(phone), '6281234567890');
  }
  for (const phone of ['', null, undefined, 'dummy', '123', '0812/0813', 'javascript:081234567890']) {
    assert.equal(contact.getWhatsAppNumber(phone), undefined);
  }
});

function links(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(links);
  return [node.props?.href, ...links(node.props?.children)].filter(Boolean);
}

test('public contact WhatsApp link follows the saved phone on each render', async () => {
  let phone = '0812 3456-7890';
  const page = load('modules/lazsip/pages/kontak/page.tsx', {
    '@/modules/lazsip/api/siteContent': { getSiteContent: async key => {
      assert.equal(key, 'kontak');
      return { phone };
    } },
    '@/modules/lazsip/api/contact': contact,
  });
  const whatsappLinks = async () => links(await page.default()).filter(href => href.startsWith('https://wa.me/'));
  assert.ok((await whatsappLinks())[0].startsWith('https://wa.me/6281234567890?'));
  phone = '+62 857 1234 5678';
  assert.ok((await whatsappLinks())[0].startsWith('https://wa.me/6285712345678?'));
  phone = '';
  assert.deepEqual(await whatsappLinks(), []);
});
