import Link from "next/link";

export function TeacherPagination({ page, lastPage, total, base, cohort }: {
  page: number; lastPage: number; total: number; base: string; cohort?: string;
}) {
  const href = (value: number) => `${base}?${new URLSearchParams({ ...(cohort ? { cohort } : {}), page: String(value) })}`;
  return <nav aria-label="Halaman daftar" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm">
    <p className="text-gray-500">{total ? `Menampilkan ${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} dari ${total}` : "0 data"} · Halaman {page} dari {lastPage}</p>
    <div className="flex gap-2">
      {page > 1 ? <Link href={href(page - 1)} className="rounded-lg border px-3 py-2">Sebelumnya</Link> : <span aria-disabled="true" className="rounded-lg border px-3 py-2 text-gray-400">Sebelumnya</span>}
      {page < lastPage ? <Link href={href(page + 1)} className="rounded-lg border px-3 py-2">Berikutnya</Link> : <span aria-disabled="true" className="rounded-lg border px-3 py-2 text-gray-400">Berikutnya</span>}
    </div>
  </nav>;
}
