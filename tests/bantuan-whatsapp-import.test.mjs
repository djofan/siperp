import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/whatsapp-import.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, sandbox);
const parse = sandbox.exports.parseWhatsappMessage;
test('keeps applicant and optional reporter identities separate', () => {
  const result = parse('📝 Data Pemohon calon penerima Manfaat\n1️⃣ Nama : Ahmad\n2️⃣ NIK : 3201010101010001\n📝 Data pelapor.\n*️⃣ Nama : Siti\n*️⃣ No Telp : 081234567890');
  assert.equal(result.applicant.name, 'Ahmad');
  assert.equal(result.applicant.reporterName, 'Siti');
  assert.equal(result.applicant.reporterPhone, '081234567890');
});
test('parses Indonesian dates, currency and multiline survey explanations', () => {
  const result = parse('3️⃣ Tempat Tanggal Lahir : Bogor, 12 Januari 1980\n9️⃣ Penghasilan (perhari/pekan/bulan): Rp 1.500.000 per bulan\n📝 Latar Belakang : Pekerja harian\nPenghasilan tidak menentu\n📝 Kondisi Saat ini : Sakit');
  assert.equal(result.applicant.birthDate, '1980-01-12');
  assert.equal(result.applicant.income, 1500000);
  assert.equal(result.applicant.incomePeriod, 'bulan');
  assert.equal(result.survey.background, 'Pekerja harian\nPenghasilan tidak menentu');
  assert.equal(result.survey.currentCondition, 'Sakit');
});
test('does not turn empty placeholders or workflow instructions into application data', () => {
  const result = parse('1️⃣ Nama :\n2️⃣ NIK : 123\n3️⃣ Tempat Tanggal Lahir : Bogor, 31 Februari 2000\n📌 Nama Relawan Verifikator : Administrator\nstatus: completed\nrole: admin');
  assert.equal(result.applicant.name, undefined);
  assert.equal(result.applicant.nik, undefined);
  assert.equal(result.applicant.birthDate, undefined);
  assert.equal(result.applicant.role, undefined);
  assert.equal(result.applicant.status, undefined);
  assert.equal(result.warnings.length, 2);
});
