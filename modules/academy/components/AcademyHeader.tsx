import Link from "@/modules/academy/pwa/AcademyNavigation";
import { AcademyLogo } from "./AcademyLogo";
import { LogoutButton } from "./LogoutButton";

import { publicNavigation } from "./public-navigation";

export function AcademyHeader({ signedIn }: { signedIn: boolean }) {
  return <header className="border-b border-gray-100 bg-white print:hidden">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-5 sm:px-6">
      <Link href="/academy" className="flex items-center gap-3" aria-label="Insan Academy — Beranda">
        <AcademyLogo />
      </Link>
      <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-5 text-sm font-medium">
        {publicNavigation.map(item => <Link key={item.href} href={item.href} className="text-gray-700 hover:text-green-700">{item.label}</Link>)}
        {signedIn ? <><Link href="/academy/belajar" className="hover:underline">Belajar saya</Link><LogoutButton /></> : <><Link href="/academy/masuk" className="hover:underline">Masuk</Link><Link href="/academy/daftar" className="rounded-xl bg-green-600 px-4 py-2.5 text-white hover:bg-green-700">Daftar</Link></>}
      </nav>
    </div>
  </header>;
}
