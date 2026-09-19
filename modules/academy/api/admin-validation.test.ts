import assert from "node:assert/strict";
import test from "node:test";
import { attachmentInput, chapterInput, courseInput, lessonInput, mayAdministerAcademy, orderField } from "./admin-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
const content = { title: "Pengantar zakat", slug: "pengantar-zakat", order: "0" };

test("admin access rejects participants, other modules, non-admin roles, and inactive users", () => {
  const user = { isActive: true, isSuperadmin: false, moduleAccess: [] as { role: string; module: { slug: string } }[] };
  assert.equal(mayAdministerAcademy(null), false);
  assert.equal(mayAdministerAcademy(user), false);
  assert.equal(mayAdministerAcademy({ ...user, moduleAccess: [{ role: "admin", module: { slug: "lazsip" } }] }), false);
  assert.equal(mayAdministerAcademy({ ...user, moduleAccess: [{ role: "viewer", module: { slug: "academy" } }] }), false);
  const admin = { ...user, moduleAccess: [{ role: "admin", module: { slug: "academy" } }] };
  assert.equal(mayAdministerAcademy(admin), true);
  assert.equal(mayAdministerAcademy({ ...admin, isActive: false }), false);
  assert.equal(mayAdministerAcademy({ ...user, isSuperadmin: true }), true);
  assert.equal(mayAdministerAcademy({ ...user, isSuperadmin: true, isActive: false }), false);
});

test("order rejects negative, fractional, missing, overflow and exponential input", () => {
  for (const order of ["-1", "1.5", "", "2147483648", "1e2", "NaN"]) assert.throws(() => orderField(form({ order })));
  assert.equal(orderField(form({ order: "2147483647" })), 2147483647);
  assert.equal(orderField(form({ order: "0" })), 0);
});

test("content defaults to draft and rejects invalid slug and oversized text", () => {
  assert.equal(chapterInput(form(content)).isPublished, false);
  assert.equal(chapterInput(form({ ...content, isPublished: "on" })).isPublished, true);
  for (const slug of ["Bad Slug", "../other", "-bad", "bad--slug"]) assert.throws(() => chapterInput(form({ ...content, slug })));
  assert.throws(() => chapterInput(form({ ...content, description: "界".repeat(25000) })));
  assert.throws(() => courseInput(form(content)));
});

test("video provider must match a supported HTTPS video URL", () => {
  const lesson = { ...content, videoProvider: "YOUTUBE", videoUrl: "https://youtu.be/dQw4w9WgXcQ" };
  assert.equal(lessonInput(form(lesson)).videoProvider, "YOUTUBE");
  assert.throws(() => lessonInput(form({ ...lesson, videoProvider: "VIMEO" })));
  assert.throws(() => lessonInput(form({ ...lesson, videoUrl: "https://evil.example/watch?v=dQw4w9WgXcQ" })));
});

test("attachments reject executable URLs and malformed fields", () => {
  const attachment = { title: "Panduan", fileUrl: "https://example.com/panduan.pdf" };
  assert.equal(attachmentInput(form(attachment)).fileSize, null);
  for (const fileUrl of ["javascript:alert(1)", "//evil.example/file", "http://example.com/file"]) assert.throws(() => attachmentInput(form({ ...attachment, fileUrl })));
  assert.throws(() => attachmentInput(form({ ...attachment, fileSize: "-1" })));
  const data = form(attachment);
  data.set("title", new Blob(["malformed"]), "title.txt");
  assert.throws(() => attachmentInput(data));
});
