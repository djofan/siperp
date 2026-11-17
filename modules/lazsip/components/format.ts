export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatCalendarParts(date: Date): { day: number; month: string } {
  const month = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date).replace(".", "").toUpperCase();
  return { day: date.getDate(), month };
}

export function formatNewsDate(newsDate: string | null | undefined, createdAt: Date): string {
  if (!newsDate) return formatDate(createdAt);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${newsDate}T00:00:00Z`));
}
