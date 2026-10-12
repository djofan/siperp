import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { SITE_NAV, whatsappAdminHref } from "@/modules/ojol/components/site/content";
import styles from "./navbar.module.css";
import footer from "./footer.module.css";
import palette from "./palette.module.css";

export default function OjolSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className={`program-header ${palette.theme} ${styles.header}`}>
        <div className={styles.inner}>
          <Link href="/ojol" className={styles.brand} aria-label="Ojol Mengaji — beranda"><Icon name="mic" className={styles.brandIcon} /><span className={styles.brandText}>Ojol Mengaji</span></Link>
          <nav aria-label="Navigasi situs" className={styles.nav}>
            {SITE_NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            <Link href="/ojol/masuk" className={styles.login}>
              Masuk <Icon name="arrowRight" />
            </Link>
            {/* Menu HP tanpa JavaScript: <details> */}
            <details className={styles.mobile}>
              <summary aria-label="Buka menu">
                <Icon name="menu" />
              </summary>
              <nav aria-label="Navigasi situs seluler" className={styles.dropdown}>
                {SITE_NAV.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className={`program-footer ${palette.theme} ${footer.footer}`}>
        <div className={footer.grid}>
          <div>
            <Link href="/ojol" className={footer.brand}><Icon name="mic" />Ojol Mengaji</Link>
            <p className={footer.description}>
              Ruang belajar Al-Qur’an untuk driver ojek online.
              <span className={footer.institution}>Program LAZ Solidaritas Insan Peduli</span>
            </p>
          </div>
          <nav aria-label="Navigasi footer" className={footer.navigation}>
            <ul className={footer.links}>
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className={`${footer.links} ${footer.access}`}>
              <li>
                <Link href="/ojol/masuk" className="transition-colors hover:text-white">
                  Masuk
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
          </nav>
        </div>
        <div className={footer.bottom}>
          <span>© {new Date().getFullYear()} LAZ Solidaritas Insan Peduli</span>
          <span>Belajar di sela perjalanan.</span>
        </div>
      </footer>
    </>
  );
}
