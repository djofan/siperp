import assert from "node:assert/strict";
import test from "node:test";
import { stageOf,checkFinalAmount } from "../modules/teknisi/api/workflow-policy";
test("legacy statuses are grouped into four service stages",()=>{assert.equal(stageOf("received"),"pending");for(const status of ["diagnosis","approval","repairing","paused"])assert.equal(stageOf(status),"process");assert.equal(stageOf("ready"),"ready");assert.equal(stageOf("collected"),"finish");});
test("final amount must be a bounded nonnegative integer",()=>{assert.equal(checkFinalAmount(0),0);assert.equal(checkFinalAmount(150000),150000);for(const value of [-1,1.5,NaN,Infinity,1000000001])assert.throws(()=>checkFinalAmount(value));});
