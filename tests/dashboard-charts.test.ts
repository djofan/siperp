import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCharts, dayKey } from "../modules/payment/api/chartData";

test("charts bucket by WIB, deduplicate donors and exclude unpaid amounts", () => {
  const now = new Date("2026-09-29T10:00:00Z");
  const row = { donorId: "a", amount: 100000, fundType: "infak", status: "paid", date: new Date("2026-09-28T18:00:00Z") };
  assert.equal(dayKey(row.date), "2026-09-29");
  const result = summarizeCharts([row, { ...row, fundType: "zakat" }, { ...row, date: new Date("2026-09-27T18:00:00Z") }, { ...row, donorId: "b", status: "pending" }, { ...row, status: "failed" }, { ...row, date: new Date("2026-09-01") }, { ...row, date: new Date("2026-10-01") }], 7, now);
  assert.equal(result.daily.length, 7);
  assert.equal(result.amount, 300000);
  assert.equal(result.donors, 1);
  assert.equal(result.daily[6].donors, 1);
  assert.equal(result.daily[6].amount, 200000);
  assert.deepEqual(result.statuses, { paid: 3, pending: 1, failed: 1 });
  assert.deepEqual(result.funds, { zakat: 100000, donation: 200000 });
  assert.equal(summarizeCharts([], 90, now).daily.length, 90);
  assert.equal(summarizeCharts([], 30, now).amount, 0);
});
