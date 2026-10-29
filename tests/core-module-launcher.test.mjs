import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Core Modul navigation opens a page instead of a module dropdown",()=>{
  const layout=readFileSync("app/admin/(dashboard)/layout.tsx","utf8");
  assert.match(layout,/href: "\/admin\/modul", label: "Modul"/);
  assert.doesNotMatch(layout,/collapsible: true|accessibleModules\.map/);
});
test("module launcher cards respect existing visibility and route to module panels",()=>{
  const page=readFileSync("app/admin/(dashboard)/modul/page.tsx","utf8");
  assert.match(page,/if \(!session\) redirect\("\/admin\/login"\)/);
  assert.match(page,/session\.isSuperadmin \? await listModules\(\) : await listAccessibleModules\(session\)/);
  assert.match(page,/href=\{`\/admin\/\$\{module\.slug\}`\}/);
  assert.match(page,/sm:grid-cols-2 xl:grid-cols-3/);
});
