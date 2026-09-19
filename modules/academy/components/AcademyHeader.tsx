import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function AcademyHeader({ signedIn }: { signedIn: boolean }) {
  return <header className="border-b border-lazsip-primary-100 bg-lazsip-cream print:hidden">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-5 sm:px-6">
      <Link href="/academy" className="flex items-center gap-3" aria-label="Zakat Academy — Beranda">
        <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-2xl bg-lazsip-primary-800 text-lg font-bold text-white">ZA</span>
        <span><span className="block text-lg font-bold text-lazsip-primary-900">Zakat Academy</span><span className="block text-[10px] font-semibold tracking-[0.2em] text-lazsip-primary-600">BELAJAR BERSAMA LAZSIP</span></span>
      </Link>
      <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-5 text-sm font-medium">
        <Link href="/academy/program" className="hover:underline">Program belajar</Link>
        {signedIn ? <><Link href="/academy/belajar" className="hover:underline">Belajar saya</Link><LogoutButton /></> : <><Link href="/academy/masuk" className="hover:underline">Masuk</Link><Link href="/academy/daftar" className="rounded-xl bg-lazsip-primary-800 px-4 py-2.5 text-white hover:bg-lazsip-primary-900">Daftar</Link></>}
      </nav>
    </div>
  </header>;
}
