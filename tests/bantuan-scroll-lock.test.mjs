import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const ts = createRequire(import.meta.url)("typescript");
const sandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync("modules/bantuan/scroll-lock.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const { lockPageScroll } = sandbox.exports;

function style(values = {}) {
  const entries = new Map(Object.entries(values).map(([name, value]) => [name, { value, priority: "" }]));
  return {
    getPropertyValue: name => entries.get(name)?.value ?? "",
    getPropertyPriority: name => entries.get(name)?.priority ?? "",
    setProperty: (name, value, priority = "") => entries.set(name, { value, priority }),
    removeProperty: name => entries.delete(name),
    entries: () => Object.fromEntries(entries),
  };
}

function page({ stableGutter = false } = {}) {
  const root = { style: style({ "scroll-behavior": "smooth", overflow: "auto" }) };
  const body = { style: style({ "padding-right": "8px", color: "green" }) };
  root.style.setProperty("scroll-behavior", "smooth", "important");
  const scrolls = [];
  const view = { scrollX: 12, scrollY: 640, getComputedStyle: () => ({ paddingRight: "8px" }), scrollTo: (x, y) => scrolls.push({ x, y, behavior: root.style.getPropertyValue("scroll-behavior") }) };
  Object.defineProperty(root, "clientWidth", { get: () => !stableGutter && root.style.getPropertyValue("overflow") === "hidden" ? 1200 : 1185 });
  return { document: { defaultView: view, documentElement: root, body }, root, body, scrolls };
}

test("a dialog freezes the background at its current position and restores styles without a jump", () => {
  const { document, root, body, scrolls } = page();
  const originalRoot = root.style.entries(), originalBody = body.style.entries();
  const unlock = lockPageScroll(document);
  assert.equal(root.style.getPropertyValue("overflow"), "hidden");
  assert.equal(body.style.getPropertyValue("position"), "fixed");
  assert.equal(body.style.getPropertyValue("top"), "-640px");
  assert.equal(body.style.getPropertyValue("left"), "-12px");
  assert.equal(body.style.getPropertyValue("padding-right"), "23px");
  assert.equal(body.style.getPropertyValue("box-sizing"), "border-box");
  // Unrelated changes made while the popup is open must survive cleanup.
  body.style.setProperty("color", "blue");
  unlock();
  assert.deepEqual(root.style.entries(), originalRoot);
  assert.deepEqual(body.style.entries(), { ...originalBody, color: { value: "blue", priority: "" } });
  assert.deepEqual(scrolls, [{ x: 12, y: 640, behavior: "auto" }]);
  unlock();
  assert.equal(scrolls.length, 1);
});

test("closing one of two dialogs keeps the background locked until the final dialog closes", () => {
  for (const outerFirst of [true, false]) {
    const { document, body, scrolls } = page();
    const outer = lockPageScroll(document), inner = lockPageScroll(document);
    (outerFirst ? outer : inner)();
    assert.equal(body.style.getPropertyValue("position"), "fixed");
    assert.equal(scrolls.length, 0);
    (outerFirst ? inner : outer)();
    assert.equal(body.style.getPropertyValue("position"), "");
    assert.equal(scrolls.length, 1);
  }
});

test("a stable scrollbar gutter is not compensated twice and separate documents stay independent", () => {
  const a = page({ stableGutter: true }), b = page();
  const closeA = lockPageScroll(a.document), closeB = lockPageScroll(b.document);
  assert.equal(a.body.style.getPropertyValue("padding-right"), "8px");
  closeA();
  assert.equal(b.body.style.getPropertyValue("position"), "fixed");
  closeB();
  assert.equal(b.body.style.getPropertyValue("padding-right"), "8px");
});
