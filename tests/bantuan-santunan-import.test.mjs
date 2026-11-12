import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import ExcelJS from 'exceljs';
const context = { exports: {}, require: () => ExcelJS, Error, Set, Number, String };
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/santunan-workbook.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { readSantunanWorkbook } = context.exports;
async function book(rows) { const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Data'); rows.forEach(row => sheet.addRow(row)); return book.xlsx.writeBuffer(); }
const headers = ['Nama', 'Program', 'Nominal Bantuan'];
test('reads both programs and numeric or Indonesian rupiah amounts', async () => {
  const rows = await readSantunanWorkbook(await book([headers, ['A', 'Anak Yatim', 300000], ['B', 'Santunan Janda Dhuafa', 'Rp 250.000,00']]));
  assert.equal(rows.length, 2); assert.equal(rows[0].category, 'orphan'); assert.equal(rows[1].category, 'widow'); assert.equal(rows[1].amount, 250000);
});
test('rejects invalid, fractional, negative, formula and duplicate rows', async () => {
  for (const row of [['A', 'Lainnya', 1], ['A', 'Anak Yatim', -1], ['A', 'Anak Yatim', 1.5], ['A', 'Anak Yatim', { formula: '1+1', result: 2 }], ['', 'Anak Yatim', 1]]) {
    await assert.rejects(readSantunanWorkbook(await book([headers, row])));
  }
  await assert.rejects(readSantunanWorkbook(await book([headers, ['A', 'Anak Yatim', 1], [' a ', 'Anak Yatim', 2]])), /berulang/);
});
test('rejects empty sheets, missing headers and more than 200 recipients', async () => {
  await assert.rejects(readSantunanWorkbook(await book([headers])), /Belum ada/);
  await assert.rejects(readSantunanWorkbook(await book([['Nama'], ['A']])));
  await assert.rejects(readSantunanWorkbook(await book([headers, ...Array.from({length:201}, (_, i) => [`Nama ${i}`, 'Anak Yatim', 1])])), /200/);
});
