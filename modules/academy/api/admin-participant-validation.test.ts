import assert from "node:assert/strict";
import test from "node:test";
import { adminPage, certificateInput } from "./admin-participant-validation";

test("certificate URL validation rejects executable, insecure and credential URLs", () => {
  const form = new FormData();
  assert.equal(certificateInput(form), null);
  for (const value of ["javascript:alert(1)", "//evil.example", "http://example.com", "https://user:secret@example.com"]) {
    form.set("certificateUrl", value);
    assert.throws(() => certificateInput(form));
  }
  form.set("certificateUrl", "https://example.com/certificate.pdf");
  assert.equal(certificateInput(form), "https://example.com/certificate.pdf");
  form.set("certificateUrl", "/certificates/test.pdf");
  assert.equal(certificateInput(form), "/certificates/test.pdf");
});

test("pagination normalizes untrusted query values", () => {
  for (const value of [undefined, ["2"], {}, "NaN", "0", "-1", "1.5", "999999999999999999999"]) assert.equal(adminPage(value), 1);
  assert.equal(adminPage("2"), 2);
});
