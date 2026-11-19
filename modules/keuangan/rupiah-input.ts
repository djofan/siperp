/** Decimal strings only: never round money through JavaScript Number. */
export function parseRupiahInput(value: string): string | null {
  const text = value.trim().replace(/^Rp\s*/i, "");
  if (!text) return "";
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return null;
  return text.replace(/\./g, "").replace(/^0+(?=\d)/, "");
}

export function formatRupiahInput(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
