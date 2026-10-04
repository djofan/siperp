import test from "node:test";
import assert from "node:assert/strict";
import { convertGoldPrice, getGoldQuote } from "../modules/lazsip/api/goldPrice";
test("gold unit conversion and unavailable source", async () => {
  assert.equal(convertGoldPrice(31.1034768, 16000), 16000);
  assert.throws(() => convertGoldPrice(-1, 16000));
  assert.throws(() => convertGoldPrice(4000, NaN));
  const original = global.fetch;
  try {
    global.fetch = async () => { throw new Error("Offline"); };
    assert.equal(await getGoldQuote(), null);
  } finally { global.fetch = original; }
});
