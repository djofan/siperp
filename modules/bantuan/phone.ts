export function isValidPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const phone = value.trim(), digits = phone.replace(/\D/g, "");
  return phone.length <= 30 && /^\+?[0-9 ()-]+$/.test(phone)
    && !/[()]/.test(phone.replace(/\([0-9]+\)/g, ""))
    && digits.length >= 8 && digits.length <= 15
    && !(phone.startsWith("+") && digits.startsWith("0"));
}
