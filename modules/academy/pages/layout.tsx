import type { Metadata } from "next";
import Link from "next/link";
import { getAcademyUser } from "../api/access";
import { AcademyHeader } from "../components/AcademyHeader";
import "../components/academy.css";

export const metadata: Metadata = {
  title: { default: "Zakat Academy | LAZSIP", template: "%s | Zakat Academy" },
  description: "Belajar Islam dan fiqh zakat bersama LAZSIP melalui materi video, kuis, dan program yang terstruktur.",
};

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const user = await getAcademyUser();
  return <div className="academy-public flex min-h-screen flex-1 flex-col bg-lazsip-cream font-sans text-lazsip-ink">
    <a href="#academy-content" className="sr-only focus:not-sr-only focus:p-4">Lewati ke konten</a>
    <AcademyHeader signedIn={!!user} />
    <main id="academy-content" className="flex-1">{children}</main>
    <footer className="border-t border-lazsip-primary-100 bg-lazsip-primary-900 text-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-4 py-10 sm:flex-row sm:px-6">
        <div><p className="font-bold">Zakat Academy</p><p className="mt-2 text-sm text-white/70">Platform belajar Islami LAZSIP.</p></div>
        <nav aria-label="Tautan footer" className="flex flex-wrap items-center gap-6 text-sm"><Link href="/academy/program">Program belajar</Link><Link href="/lazsip">Tentang LAZSIP</Link><Link href="/lazsip/kontak">Hubungi kami</Link></nav>
      </div>
    </footer>
  </div>;
}
