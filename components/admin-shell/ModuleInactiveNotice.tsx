import Link from "next/link";

// Tampil di admin modul yang masih nonaktif — hanya superadmin yang bisa sampai ke sini.
export function ModuleInactiveNotice() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
      <span>Modul ini nonaktif: hanya superadmin yang bisa membuka, dan halaman publiknya 404 untuk pengunjung.</span>
      <Link href="/admin/super/modul" className="font-semibold underline-offset-2 hover:underline">
        Aktifkan di Modul Terdaftar
      </Link>
    </div>
  );
}
