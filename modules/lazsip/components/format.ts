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

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatCalendarParts(date: Date): { day: number; month: string } {
  const month = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date).replace(".", "").toUpperCase();
  return { day: date.getDate(), month };
}
