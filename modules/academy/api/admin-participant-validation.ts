import { AcademyError } from "./errors";
import { textField } from "./admin-validation";
import { safeResourceUrl } from "./policy";

export function certificateInput(form: FormData) {
  const raw = textField(form, "certificateUrl", "URL sertifikat", 2048, false);
  const url = raw ? safeResourceUrl(raw) : null;
  if (raw && !url) throw new AcademyError("Gunakan URL HTTPS atau path lokal yang valid.");
  return url;
}

export function adminPage(value: unknown) {
  const page = typeof value === "string" || typeof value === "number" ? Number(value) : 1;
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
