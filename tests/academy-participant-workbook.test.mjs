import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import ExcelJS from 'exceljs';

const exports = {};
const source = readFileSync(new URL('../modules/academy/components/admin/participant-workbook.ts', import.meta.url), 'utf8');
// Keep arrays in the same realm as ExcelJS, which checks instanceof Array.
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInThisContext(`(function(exports, require) { ${compiled}\n})`)(exports, createRequire(import.meta.url));
const { readParticipantWorkbook, participantTemplate, participantAccountsWorkbook } = exports;
async function workbook(rows, headers = ['Nama', 'No HP', 'Alamat']) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Peserta');
  sheet.addRow(headers);
  rows.forEach(row => sheet.addRow(row));
  return book.xlsx.writeBuffer();
}

test('Excel template has only three requested columns and preserves phone numbers as text', async () => {
  const bytes = await participantTemplate();
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.getWorksheet(1);
  assert.deepEqual(sheet.getRow(1).values.slice(1), ['Nama', 'No HP', 'Alamat']);
  assert.equal(sheet.getColumn(2).numFmt, '@');
  assert.equal(sheet.getCell('A1').fill.fgColor.argb, 'FF005840');
  await assert.rejects(() => readParticipantWorkbook(bytes), /belum berisi data/);
  sheet.addRow(['Peserta Contoh', '081234567890', 'Jakarta']);
  const rows = await readParticipantWorkbook(await book.xlsx.writeBuffer());
  assert.equal(rows[0].phone, '081234567890');
});

test('Excel reads header aliases, numeric phones, blank rows and original row numbers', async () => {
  const rows = await readParticipantWorkbook(await workbook([
    [' Peserta Satu ', 81234567890, ' Jakarta '], [], ['Peserta Dua', '+62 81234567891', 'Bogor'],
  ], ['Nama Lengkap', 'Nomor HP', 'Alamat']));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Peserta Satu');
  assert.equal(rows[0].phone, '81234567890');
  assert.equal(rows[0].address, 'Jakarta');
  assert.equal(rows[1].rowNumber, 4);
});

test('Excel rejects missing headers, duplicate headers, incomplete rows, formulas and oversized batches', async () => {
  for (const [rows, headers, message] of [
    [[['Peserta', '081234567890', 'Jakarta']], ['Nama', 'Telepon', 'Alamat'], /judul kolom/],
    [[['Peserta', '081234567890', 'Jakarta']], ['Nama', 'Nama', 'Alamat'], /berulang/],
    [[['Peserta', '', 'Jakarta']], undefined, /Baris 2.*wajib diisi/],
    [[['Peserta', { formula: '1+1', result: 2 }, 'Jakarta']], undefined, /tanpa rumus/],
    [Array.from({ length: 201 }, () => ['Peserta', '081234567890', 'Jakarta']), undefined, /Maksimal 200/],
  ]) await assert.rejects(() => workbook(rows, headers).then(readParticipantWorkbook), message);
  const book = new ExcelJS.Workbook();
  book.addWorksheet('Satu').addRow(['Nama', 'No HP', 'Alamat']);
  book.addWorksheet('Dua').addRow(['Jangan diam-diam abaikan']);
  await assert.rejects(() => book.xlsx.writeBuffer().then(readParticipantWorkbook), /satu lembar/);
});

test('account workbook keeps login credentials and phone strings without executable formulas', async () => {
  const bytes = await participantAccountsWorkbook([{ name: '=1+1', phone: '6281234567890', code: 'PAZ001', password: 'Ia!ExamplePassword' }]);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.getWorksheet(1);
  assert.deepEqual(sheet.getRow(2).values.slice(1), ['=1+1', '6281234567890', 'PAZ001', 'Ia!ExamplePassword']);
  assert.equal(sheet.getCell('A2').type, ExcelJS.ValueType.String);
});
