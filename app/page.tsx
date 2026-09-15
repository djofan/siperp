import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold text-foreground">Platform SIP</h1>
      <p className="max-w-md text-foreground/60">
        Platform digital terpadu Solidaritas Insan Peduli. Halaman publik tiap
        divisi akan hadir di sini seiring modulnya dikerjakan.
      </p>
      <Link
        href="/admin/login"
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Masuk Admin
      </Link>
    </main>
  );
}
