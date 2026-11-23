import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";
const require=createRequire(import.meta.url),ts=require("typescript"),ctx={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync("lib/number-format.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
const {formatNumberId,formatNumericText,parseIntegerInput,formatIntegerInput}=ctx.exports;
test("Indonesian number displays group thousands without changing identifiers or missing values",()=>{
 assert.equal(formatNumberId(1500000),"1.500.000");assert.equal(formatNumberId(1234567.5),"1.234.567,5");assert.equal(formatNumberId(-12345),"-12.345");assert.equal(formatNumberId(9007199254740993n),"9.007.199.254.740.993");
 for(const value of ["081234567890","00001234","2026-11-23",null,undefined,false])assert.equal(formatNumericText(value),value);
 assert.equal(formatNumberId(NaN),"—");assert.equal(formatNumberId(Infinity),"—");
});
test("rupiah fields keep full integer precision and reject ambiguous pasted decimals",()=>{
 for(const [display,raw] of [["1.500.000","1500000"],["Rp 1.500.000","1500000"],["1500000","1500000"],["-1.500","-1500"],["0001","1"],["",""]])assert.equal(parseIntegerInput(display),raw);
 for(const value of ["1,5","12.34","1.5","1e6","100abc","--1"])assert.equal(parseIntegerInput(value),null);
 assert.equal(parseIntegerInput("1.00",false),"100");assert.equal(formatIntegerInput("9007199254740993"),"9.007.199.254.740.993");assert.equal(formatIntegerInput("1500000"),"1.500.000");
});
