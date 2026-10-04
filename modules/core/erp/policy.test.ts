import test from "node:test";
import assert from "node:assert/strict";
import { bankDate, canMatchBank, normalizeEmail, normalizePhone, parseBankCsv, positiveRupiah } from "./policy";
test("contact normalization keeps equivalent Indonesian phone numbers together", () => {
  assert.equal(normalizePhone("+62 811-1186-626"), "628111186626");
  assert.equal(normalizePhone("0811 1186 626"), "628111186626");
  assert.equal(normalizePhone("008111"), null);
  assert.equal(normalizePhone("not-a-number"), null);
  assert.equal(normalizeEmail(" NAME@EXAMPLE.COM "), "name@example.com");
  assert.equal(normalizeEmail("invalid"), null);
});
test("CSV handles quoted commas, escaped quotes and BOM", () => {
  const [row] = parseBankCsv('\uFEFFtanggal,referensi,keterangan,arah,nominal\r\n2026-10-02,R1,"Donasi, ""jumat""",masuk,100000\r\n');
  assert.equal(row.amount, 100000); assert.equal(row.description, 'Donasi, "jumat"');
  assert.equal(row.bookedAt.toISOString(), "2026-10-01T17:00:00.000Z");
});
test("CSV rejects invalid dates, decimal amounts, unclosed quotes and extra cells", () => {
  const header = "tanggal,referensi,keterangan,arah,nominal\n";
  for (const row of ['2026-02-30,R1,test,masuk,100', '2026-10-02,R1,test,masuk,1.5', '2026-10-02,R1,"bad,masuk,100', '2026-10-02,R1,test,masuk,100,extra']) assert.throws(() => parseBankCsv(header+row));
  assert.throws(() => bankDate("02/10/2026")); assert.throws(() => positiveRupiah("-100")); assert.throws(() => positiveRupiah("2147483648"));
});
test("reconciliation cannot cross account, amount or direction", () => {
  const line = { accountId: "zakat", amount: 100, direction: "masuk" };
  assert.ok(canMatchBank(line, line));
  assert.ok(!canMatchBank(line, { ...line, accountId: "infak" }));
  assert.ok(!canMatchBank(line, { ...line, amount: 99 }));
  assert.ok(!canMatchBank(line, { ...line, direction: "keluar" }));
});
