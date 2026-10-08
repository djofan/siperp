import Link from "next/link";
import { Wordmark } from "@/modules/tanwir/components/Wordmark";
import { Icon } from "@/modules/tanwir/components/icons";
import { buttonClass } from "@/modules/tanwir/components/ui";
import { SITE_NAV, whatsappAdminHref } from "@/modules/tanwir/components/site/content";

export default function TanwirSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="program-header sticky top-0 z-40 bg-tanwir-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Navigasi situs" className="hidden items-center gap-8 text-sm text-tanwir-muted md:flex">
            {SITE_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-tanwir-ink">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/tanwir/masuk" className={buttonClass("primary", "h-10 px-4")}>
              Masuk
            </Link>
            {/* Menu HP tanpa JavaScript: <details> */}
            <details className="group relative md:hidden">
              <summary aria-label="Buka menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-tanwir-ink hover:bg-tanwir-surface [&::-webkit-details-marker]:hidden">
                <Icon name="menu" />
              </summary>
              <div className="absolute right-0 top-12 w-52 rounded-2xl bg-tanwir-surface p-2  ring-1 ring-tanwir-line">
                {SITE_NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 text-sm hover:bg-tanwir-paper">
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="program-footer mt-24 bg-tanwir-ink text-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark inverted />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Program pembinaan hafalan Qur&apos;an untuk guru ngaji TPQ, bagian dari program pemberdayaan LAZ Solidaritas Insan Peduli.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Jelajahi</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Akses</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/tanwir/masuk" className="transition-colors hover:text-white">
                  Masuk dengan kode akun
                </Link>
              </li>
              <li>
                <a href={whatsappAdminHref()} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                  Hubungi admin
                </a>
              </li>
              <li>
                <Link href="/lazsip" className="transition-colors hover:text-white">
                  LAZ SIP
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-8 text-xs text-white/40 sm:px-6">
          © {new Date().getFullYear()} LAZ Solidaritas Insan Peduli · Tanwir Qurani
        </div>
      </footer>
    </>
  );
}
