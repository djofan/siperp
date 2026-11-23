const numbers = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 20 });

export function formatNumberId(value: number | bigint): string {
  return typeof value === "number" && !Number.isFinite(value) ? "—" : numbers.format(value);
}

export function formatNumericText<T>(value: T): T | string {
  return typeof value === "number" || typeof value === "bigint" ? formatNumberId(value) : value;
}

export function parseIntegerInput(text: string, strict = true): string | null {
  const clean = text.trim().replace(/^Rp\s*/i, "").replace(/\s/g, "");
  if (strict && clean.includes(".") && !/^-?\d{1,3}(?:\.\d{3})+$/.test(clean)) return null;
  const raw = clean.replace(/\./g, "");
  if (raw === "") return "";
  if (!/^-?\d+$/.test(raw)) return null;
  return raw.replace(/^(-?)0+(?=\d)/, "$1");
}

export function formatIntegerInput(raw: string): string {
  if (!/^-?\d+$/.test(raw)) return raw;
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  return (negative ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
