/** Canonical Indonesian mobile number; shared by browser validation and server. */
export function normalizeDonorPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (!/^628\d{8,11}$/.test(digits)) return null;
  return digits;
}
