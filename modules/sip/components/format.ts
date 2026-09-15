export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
