import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url),ts=require("typescript"),context={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync("modules/lazsip/api/uniqueCode.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {applyUniqueCode}=context.exports;
test("campaigns without a unique code keep entered amounts unchanged",()=>{
 for(const amount of [1,50000,12345,100000000])assert.equal(applyUniqueCode(amount,""),amount);
 assert.equal(applyUniqueCode(12345,"07"),12407);
 assert.equal(applyUniqueCode(12345,"00"),12400);
});
