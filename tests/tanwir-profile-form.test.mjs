import test from "node:test";
import assert from "node:assert/strict";
import { prepareProfileForm } from "../modules/tanwir/api/profile-form.ts";

test("saving a Tanwir profile without a new photo omits the empty upload and keeps profile edits", () => {
  const form = new FormData();
  form.set("name", "Peserta uji");
  form.set("teachingPlace", "TPQ diperbarui");
  form.set("photo", new File([], "undefined", { type: "application/octet-stream" }));
  const result = prepareProfileForm(form);
  assert.equal(result.has("photo"), false);
  assert.equal(result.get("name"), "Peserta uji");
  assert.equal(result.get("teachingPlace"), "TPQ diperbarui");
  assert.equal(form.has("photo"), true);
});

test("a selected Tanwir profile photo is retained for backend validation", async () => {
  const form = new FormData();
  form.set("photo", new File(["image data"], "foto.webp", { type: "image/webp" }));
  const result = prepareProfileForm(form).get("photo");
  assert.equal(result.name, "foto.webp");
  assert.equal(await result.text(), "image data");
});
