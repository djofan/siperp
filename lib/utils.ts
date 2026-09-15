type ClassValue = string | number | null | boolean | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("id", { numeric: "auto" });

export function formatRelativeTime(date: Date): string {
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absDiff = Math.abs(diffSeconds);

  if (absDiff < 60) return "baru saja";

  for (const [unit, secondsInUnit] of RELATIVE_TIME_UNITS) {
    if (absDiff >= secondsInUnit) {
      return relativeTimeFormatter.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }

  return relativeTimeFormatter.format(Math.round(diffSeconds / 60), "minute");
}
