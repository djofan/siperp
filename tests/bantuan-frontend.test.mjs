import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

test("Bantuan is internal and enters through the Core access guard", () => {
  const layout = readFileSync("app/admin/bantuan/layout.tsx", "utf8");
  assert.match(layout, /requireModuleAdmin\("bantuan"\)/);
  assert.equal(existsSync("app/(public)/bantuan"), false);
  const routes = readFileSync("api/app/Modules/Bantuan/Providers/BantuanServiceProvider.php", "utf8");
  assert.match(routes, /auth:sanctum/);
  assert.match(routes, /module\.access:bantuan/);
});

test("form mutations preserve version guards and partial drafts", () => {
  const intake = readFileSync("modules/bantuan/components/IntakeForm.tsx", "utf8");
  const actions = readFileSync("modules/bantuan/components/ActionPanel.tsx", "utf8");
  assert.match(intake, /draft:!final/);
  assert.match(intake, /Simpan draft/);
  assert.match(actions, /version:row\.version/);
  assert.match(actions, /Simpan draft survei/);
  assert.doesNotMatch(intake + actions, /localStorage|sessionStorage/);
});

test("private evidence is only linked through authenticated module endpoints", () => {
  const evidence = readFileSync("modules/bantuan/components/ActionPanel.tsx", "utf8");
  assert.match(evidence, /\/api\/bantuan\/documents\//);
  assert.doesNotMatch(evidence, /\/storage\//);
  const photos = readFileSync("modules/bantuan/api/photos.ts", "utf8");
  assert.match(photos, /createImageBitmap/);
  assert.match(photos, /blob\.size<=1024\*1024/);
});

test("layout keeps field and navigation spacing on desktop and mobile", () => {
  const css = readFileSync("modules/bantuan/components/Workspace.module.css", "utf8");
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /prefers-reduced-motion/);
});

test("photo refresh does not unmount active forms or rehydrate entered values", () => {
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const refresh=workspace.match(/const reload=useCallback\(\(\)=>\{([^}]+)\}/)?.[1];
  assert.ok(refresh);
  assert.doesNotMatch(refresh,/setLoading/);
  assert.match(workspace, /ActionPanel key=\{row\.id\}/);
  assert.doesNotMatch(workspace,/key=\{row\.id\+.*row\.version/);
  const photoRefresh=intake.match(/const refreshDocuments=useCallback\(async\(\)=>\{([\s\S]*?)\},\[\]\)/)?.[1];
  assert.ok(photoRefresh);
  assert.match(photoRefresh,/setDocuments\(latest\.documents\)/);
  assert.doesNotMatch(photoRefresh,/setForm|setLoaded|router|location|reload/);
  assert.match(intake,/const initial=initialSnapshot\.current/);
  assert.match(intake,/\},\[viewer\.id,vaultKey\]\)/);
  assert.match(intake,/hidden=\{form\.step!==3\}/);
});
