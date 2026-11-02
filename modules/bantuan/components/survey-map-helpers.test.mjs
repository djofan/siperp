import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("./survey-map-helpers.ts", import.meta.url), "utf8");
const context = { exports: {}, URLSearchParams };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
const { surveyPoint, surveyDistance, formatSurveyDistance, nearbyLongitude, surveyDirections } = context.exports;

test("coordinate pairs reject missing, nonnumeric and out-of-range data but preserve zero", () => {
  for (const [lat, lng] of [[null, 1], [1, undefined], ["", 1], ["  ", 1], [true, 2], [91, 0], [0, -181], [Infinity, 0], [NaN, 0], [[], 0]]) {
    assert.equal(surveyPoint(lat, lng), null);
  }
  assert.equal(surveyPoint(" -6.2 ", "106.8").latitude, -6.2);
  assert.equal(surveyPoint(0, 0).longitude, 0);
  assert.equal(surveyPoint(-90, 180).latitude, -90);
});

test("great-circle distance handles identical, known, date-line and antipodal endpoints", () => {
  const point = (latitude, longitude) => ({ latitude, longitude });
  assert.equal(surveyDistance(point(-6.2, 106.8), point(-6.2, 106.8)), 0);
  assert.ok(Math.abs(surveyDistance(point(0, 0), point(0, 1)) - 111195.08) < .01);
  assert.ok(Math.abs(surveyDistance(point(0, 179), point(0, -179)) - 222390.16) < .1);
  assert.ok(Math.abs(surveyDistance(point(0, 0), point(0, 180)) - 20015114.44) < .1);
  assert.equal(nearbyLongitude(179, -179), 181);
  assert.equal(nearbyLongitude(-179, 179), -181);
});

test("distance labels use metres or kilometres and links contain only explicit coordinates", () => {
  assert.equal(formatSurveyDistance(123.4), "123 m");
  assert.equal(formatSurveyDistance(1250), "1,25 km");
  const destination = { latitude: -6.2, longitude: 106.8 };
  const origin = { latitude: -6.3, longitude: 106.7 };
  const url = new URL(surveyDirections(destination, origin));
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("destination"), "-6.2,106.8");
  assert.equal(url.searchParams.get("origin"), "-6.3,106.7");
  assert.equal(new URL(surveyDirections(destination, null)).searchParams.has("origin"), false);
});
