import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const ts=createRequire(import.meta.url)("typescript"),context={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync("modules/bantuan/phone.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {isValidPhone}=context.exports;
test("Bantuan telephone validation accepts formatted local and international numbers",()=>{
  for(const phone of ["08123456789","+628123456789","02112345678","0812-3456-7890","+62 812 3456 7890","(021) 12345678"])
    assert.equal(isValidPhone(phone),true,phone);
});
test("Bantuan telephone validation rejects letters malformed groups and invalid digit counts",()=>{
  for(const phone of ["BUKAN-NOMOR","0812abc3456","123","1234567890123456","++628123456789","+08123456789","0812/3456789","(021 12345678",[],null,""])
    assert.equal(isValidPhone(phone),false,String(phone));
});
