export type ParticipantModule = "academy" | "teknisi";
export class ParticipantError extends Error {}
export function formatNip(moduleSlug: ParticipantModule, number: number) {
  if (!Number.isSafeInteger(number) || number < 1) throw new ParticipantError("Nomor akun tidak valid.");
  return `${moduleSlug === "academy" ? "PAZ" : "PTH"}${String(number).padStart(moduleSlug === "academy" ? 3 : 2, "0")}`;
}
export function participantInput(form: FormData, moduleSlug: ParticipantModule, requirePassword = true) {
  const name = String(form.get("name") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();
  const digits = String(form.get("phone") ?? "").replace(/[\s()+.-]/g, "");
  const phone = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const password = String(form.get("password") ?? "");
  const gender = String(form.get("gender") ?? "");
  if (name.length < 2 || name.length > 100) throw new ParticipantError("Nama harus berisi 2–100 karakter.");
  if (!address || address.length > 2000) throw new ParticipantError("Alamat wajib diisi, maksimal 2.000 karakter.");
  if (!/^628\d{7,12}$/.test(phone)) throw new ParticipantError("Masukkan nomor HP Indonesia yang valid, misalnya 081234567890.");
  if ((requirePassword || password) && (password.length < 10 || Buffer.byteLength(password, "utf8") > 72)) throw new ParticipantError("Password minimal 10 karakter dan maksimal 72 byte.");
  if (moduleSlug === "academy" && gender !== "IKHWAN" && gender !== "AKHWAT") throw new ParticipantError("Pilih grup Ikhwan atau Akhwat.");
  return { name, address, phone, password, gender: gender as "IKHWAN" | "AKHWAT" };
}
