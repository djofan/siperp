import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

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
