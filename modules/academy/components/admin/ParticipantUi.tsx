import Link from "next/link";
export function adminDate(value: Date | null | undefined) {
  return value ? value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) + " WIB" : "—";
}
export function ProgressSummary({ value }: { value: {
  completedLessons: number; totalLessons: number; passedQuizzes: number; totalQuizzes: number; percent: number; isEligible: boolean;
} }) {
  return <div className="space-y-2 text-sm text-foreground">
    <p>{value.completedLessons}/{value.totalLessons} materi selesai · {value.passedQuizzes}/{value.totalQuizzes} kuis lulus</p>
    <progress className="h-2 w-full max-w-sm accent-accent" value={value.percent} max={100} aria-label="Persentase materi selesai" />
    <p className={value.isEligible ? "font-semibold text-success" : "text-foreground/60"}>{value.isEligible ? "Memenuhi syarat kelulusan" : "Belum memenuhi syarat kelulusan"}</p>
  </div>;
}
export function PageLinks({ page, pages, total, base, query, pageKey = "page" }: {
  page: number; pages: number; total: number; base: string; query: Record<string, string>; pageKey?: string;
}) {
  const href = (value: number) => base + "?" + new URLSearchParams({ ...query, [pageKey]: String(value) });
  return <nav aria-label={"Navigasi " + pageKey} className="mt-5 flex flex-wrap gap-4 text-sm text-foreground">
    <span>{total} data · Halaman {page} dari {pages}</span>
    {page > 1 && <Link className="text-accent" href={href(page - 1)}>Sebelumnya</Link>}
    {page < pages && <Link className="text-accent" href={href(page + 1)}>Berikutnya</Link>}
  </nav>;
}
