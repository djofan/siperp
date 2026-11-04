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
  assert.equal(result.warnings.length, 3);
});


test('accepts informal choices without changing the available form options', () => {
  const r = parse('Nama lengkap = Siti\nStatus perkawinan: lajang\nTempat tinggal: ngontrak\nMerokok: nggak merokok\nShalat 5 waktu: kadang-kadang\nPunya SKTM: blm punya\nIzin publikasi: saya bersedia\nJenis kelamin: wanita\nPeriode penghasilan: mingguan');
  assert.equal(r.applicant.name, 'Siti');
  assert.equal(r.applicant.maritalStatus, 'Belum menikah');
  assert.equal(r.applicant.housing, 'Kontrak-sewa');
  assert.equal(r.applicant.smoking, 'Tidak');
  assert.equal(r.applicant.prayer, 'Jarang');
  assert.equal(r.applicant.hasSktm, false);
  assert.equal(r.applicant.publicationConsent, true);
  assert.equal(r.applicant.gender, 'perempuan');
  assert.equal(r.applicant.incomePeriod, 'pekan');
});
test('does not guess ambiguous choices or overwrite a repeated identity', () => {
  const r = parse('Nama: Ahmad\nNama lengkap: Budi\nSKTM: belum tahu\nIzin publikasi: ya/tidak\nTempat tinggal: belum jelas\nStatus: duda atau menikah');
  assert.equal(r.applicant.name, 'Ahmad');
  for (const field of ['hasSktm','publicationConsent','housing','maritalStatus']) assert.equal(r.applicant[field], undefined);
  assert.ok(r.warnings.length >= 4);
});
test('recognizes a stopped habit as no and preserves numeric multiline values', () => {
  const r = parse('Merokok: sudah berhenti\nNIK:\n3201010101010001\nTelp - 081234567890');
  assert.equal(r.applicant.smoking, 'Tidak');
  assert.equal(r.applicant.nik, '3201010101010001');
  assert.equal(r.applicant.phone, '081234567890');
});


test('normalizes yes/no alternatives and negative statements without assuming uncertain answers', () => {
  for (const answer of ['iya', 'sdh punya', 'udah ada', 'alhamdulillah sudah']) assert.equal(parse(`SKTM (ya/tidak): ${answer}`).applicant.hasSktm,true,answer);
  for (const answer of ['tdk ada', 'blm punya', 'ngga', 'sudah tidak punya']) assert.equal(parse(`SKTM: ${answer}`).applicant.hasSktm,false,answer);
  for (const answer of ['belum tahu', 'mungkin', 'ya atau tidak', 'iya tapi belum pasti']) assert.equal(parse(`SKTM: ${answer}`).applicant.hasSktm,undefined,answer);
  assert.equal(parse('Merokok: sudah tidak merokok').applicant.smoking,'Tidak');
});
