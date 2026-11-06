import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { PDFDocument } from 'pdf-lib';

const sandbox = { exports: {}, require: createRequire(import.meta.url), Uint8Array, ArrayBuffer, Date };
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/certificate.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, sandbox);
const { createCertificate, certificateTemplates } = sandbox.exports;
const values = { recipient: 'Siti Rahmawati', verifier: 'Suparta', amount: 10550000, date: '2026-11-03' };
for (const template of Object.keys(certificateTemplates)) {
  test(`generates ${template} certificate from the supplied original layout`, async () => {
    const bytes = await createCertificate({ ...values, template }, readFileSync(`public/bantuan/certificates/${template}.pdf`));
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1);
    assert.ok(pdf.getPages()[0].getWidth() > pdf.getPages()[0].getHeight());
    assert.match(pdf.getTitle(), /Sertifikat penyerahan/);
  });
}
test('rejects missing names, invalid amounts and impossible dates before generating', async () => {
  for (const change of [{ recipient: '' }, { verifier: ' ' }, { amount: 0 }, { amount: 1.5 }, { date: '2026-02-31' }]) {
    await assert.rejects(createCertificate({ ...values, template: 'pendidikan', ...change }, new Uint8Array()));
  }
});
