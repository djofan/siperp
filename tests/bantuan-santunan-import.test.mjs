import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import ExcelJS from 'exceljs';
const context = { exports: {}, require: () => ExcelJS, Error, Set, Number, String };
new Function('exports', 'require', ts.transpileModule(readFileSync('modules/bantuan/santunan-workbook.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(context.exports, context.require);
const { readSantunanWorkbook, matchSantunanVerifiers, suggestSantunanVerifiers, santunanWorkbook } = context.exports;
async function book(rows) { const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Data'); rows.forEach((row, index) => sheet.addRow(index > 0 && row.length === 3 ? [...row, 'Petugas Uji'] : row)); return book.xlsx.writeBuffer(); }
const headers = ['Nama', 'Program', 'Nominal Bantuan', 'Nama Verifikator'];
test('reads both programs and numeric or Indonesian rupiah amounts', async () => {
  const rows = await readSantunanWorkbook(await book([headers, ['A', 'Anak Yatim', 300000], ['B', 'Santunan Janda Dhuafa', 'Rp 250.000,00']]));
  assert.equal(rows.length, 2); assert.equal(rows[0].category, 'orphan'); assert.equal(rows[1].category, 'widow'); assert.equal(rows[1].amount, 250000);
});
test('rejects invalid, fractional, negative, formula and duplicate rows', async () => {
  for (const row of [['A', '__proto__', 1], ['A', 'constructor', 1], ['A', 'Lainnya', 1], ['A', 'Anak Yatim', -1], ['A', 'Anak Yatim', 1.5], ['A', 'Anak Yatim', { formula: '1+1', result: 2 }], ['', 'Anak Yatim', 1]]) {
    await assert.rejects(readSantunanWorkbook(await book([headers, row])));
  }
  await assert.rejects(readSantunanWorkbook(await book([headers, ['A', 'Anak Yatim', 1], [' a ', 'Anak Yatim', 2]])), /berulang/);
});
test('rejects empty sheets, missing headers and more than 200 recipients', async () => {
  await assert.rejects(readSantunanWorkbook(await book([headers])), /Belum ada/);
  await assert.rejects(readSantunanWorkbook(await book([['Nama'], ['A']])));
  await assert.rejects(readSantunanWorkbook(await book([headers, ...Array.from({length:201}, (_, i) => [`Nama ${i}`, 'Anak Yatim', 1])])), /200/);
});

test('matches full active names ignoring case and excess whitespace, rejects unknown and ambiguous names', () => {
  const rows = [{recipientName:'A',category:'orphan',amount:1,verifierName:'  PETUGAS   Uji '}];
  assert.equal(matchSantunanVerifiers(rows, [{name:'Petugas Uji'}])[0].verifierName, 'Petugas Uji');
  assert.throws(() => matchSantunanVerifiers(rows, []), /tidak ada/);
  assert.throws(() => matchSantunanVerifiers(rows, [{name:'Petugas Uji'},{name:'petugas uji'}]), /ganda/);
  assert.throws(() => matchSantunanVerifiers([{...rows[0],verifierName:'Petugas'}], [{name:'Petugas Uji'}]), /tidak ada/);
});
test('dummy workbook uses provided names and roundtrips through importer with hidden dropdown references', async () => {
  const buffer = await santunanWorkbook(['Petugas Satu','Petugas Dua'], true);
  const rows = await readSantunanWorkbook(buffer);
  assert.equal(rows.length, 6);
  assert.equal(matchSantunanVerifiers(rows,[{name:'Petugas Satu'},{name:'Petugas Dua'}]).length,6);
  const book = new ExcelJS.Workbook(); await book.xlsx.load(buffer);
  assert.equal(book.worksheets[1].state, 'hidden');
  assert.equal(book.worksheets[0].getCell('D2').dataValidation.type, 'list');
  await assert.rejects(santunanWorkbook([], true), /Belum ada/);
});


test('imports new programs, optional frequency and non-routine orphan labels while retaining legacy columns', async () => {
  const rows = await readSantunanWorkbook(await book([headers,
    ['A','Anak Yatim Tidak Rutin',100,'Petugas Uji'], ['B','Lembaga Tahfidz',200,'Petugas Uji'],
    ['C','Pendidikan',300,'Petugas Uji'], ['D','Umum',400,'Petugas Uji']]));
  assert.deepEqual(rows.map(row=>row.category),['orphan','tahfidz','education','general']);
  assert.equal(rows[0].frequency,'non_routine');
  const expanded=[...headers,'Jenis Santunan'];
  const result=await readSantunanWorkbook(await book([expanded,['A','Pendidikan',10,'Petugas Uji','Tidak rutin'],['A','Pendidikan',10,'Petugas Uji','Rutin']]));
  assert.deepEqual(result.map(row=>row.frequency),['non_routine','routine']);
  await assert.rejects(readSantunanWorkbook(await book([expanded,['A','Janda Dhuafa',10,'Petugas Uji','Tidak rutin']])));
  await assert.rejects(readSantunanWorkbook(await book([expanded,['A','Umum',10,'Petugas Uji','Acak']])));
});

test('suggests misspellings and missing words but requires an explicit target account', () => {
  const people=[{id:'one',name:'Abdul Fuad'},{id:'two',name:'Bang Ansor'},{id:'three',name:'Petugas Lain'}];
  assert.equal(suggestSantunanVerifiers('Abdul Fuad',people)[0].id,'one');
  assert.equal(suggestSantunanVerifiers('Abdl Fuaad',people)[0].id,'one');
  assert.ok(suggestSantunanVerifiers('Fuad',people).some(person=>person.id==='one'));
  const row={recipientName:'QA',category:'orphan',amount:10,verifierName:'Abdl Fuaad'};
  assert.throws(()=>matchSantunanVerifiers([row],people));
  const confirmed=matchSantunanVerifiers([{...row,verifierId:'one'}],people)[0];
  assert.equal(confirmed.verifierId,'one'); assert.equal(confirmed.verifierName,row.verifierName);
  assert.throws(()=>matchSantunanVerifiers([{...row,verifierId:'removed'}],people));
  assert.equal(suggestSantunanVerifiers('',people).length,0);
});
