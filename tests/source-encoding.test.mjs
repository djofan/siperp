import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("tracked source files use valid UTF-8 for Turbopack", () => {
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const invalid = files.filter(file => /\.(tsx?|mjs|css|json)$/.test(file)).filter(file => {
    try { decoder.decode(readFileSync(file)); return false; }
    catch { return true; }
  });
  assert.deepEqual(invalid, [], "Source files must be saved as UTF-8");
});
