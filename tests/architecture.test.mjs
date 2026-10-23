import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("business frontend modules never import sibling implementations", () => {
  const violations = [];
  for (const file of filesBelow("modules").filter((file) => /\.[cm]?[jt]sx?$/.test(file))) {
    const owner = path.relative(path.join(root, "modules"), file).split(path.sep)[0];
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /@\/lib\/domain/, file);
    for (const match of source.matchAll(/@\/modules\/([^/"']+)/g)) {
      if (![owner, "core", "payment"].includes(match[1])) violations.push(path.relative(root, file) + " -> " + match[1]);
    }
  }
  assert.deepEqual(violations, []);
});

test("backend modules cannot reach into sibling business implementations", () => {
  const violations = [];
  for (const file of filesBelow("api/app/Modules").filter((file) => file.endsWith(".php"))) {
    const owner = path.relative(path.join(root, "api/app/Modules"), file).split(path.sep)[0];
    for (const match of readFileSync(file, "utf8").matchAll(/App\\Modules\\([A-Za-z]+)\\/g)) {
      if (![owner, "Core", "Payment"].includes(match[1])) violations.push(path.relative(root, file) + " -> " + match[1]);
    }
  }
  assert.deepEqual(violations, []);
});

test("shared contracts never depend on module implementations", () => {
  for (const file of [...filesBelow("contracts"), ...filesBelow("api/app/Contracts")]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /@\/modules\/|App\\Modules\\/, file);
  }
});

function filesBelow(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const item = path.join(absolute, name);
    return statSync(item).isDirectory() ? filesBelow(path.relative(root, item)) : [item];
  });
}

test("Next.js contains no API route handlers", () => {
  const handlers = filesBelow("app/api").filter((file) => /route\.(?:ts|tsx|js|jsx)$/.test(file));
  assert.deepEqual(handlers, []);
});

test("frontend source does not import database or Laravel internals", () => {
  const frontend = ["app", "components", "lib", "modules"].flatMap(filesBelow).filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
  const violations = frontend.filter((file) => {
    const source = readFileSync(file, "utf8");
    return /@prisma\/client|from\s+["']@\/lib\/prisma["']|api\/app\/Modules/.test(source);
  });
  assert.deepEqual(violations.map((file) => path.relative(root, file)), []);
});

test("browser API namespace is proxied to Laravel", () => {
  const config = readFileSync(path.join(root, "next.config.ts"), "utf8");
  assert.match(config, /source:\s*["']\/api\/:path\*["']/);
  assert.match(config, /destination:\s*\`\$\{backend\}\/\:path\*\`/);
});
