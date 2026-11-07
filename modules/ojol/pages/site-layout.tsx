import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { SITE_NAV, whatsappAdminHref } from "@/modules/ojol/components/site/content";
import styles from "./navbar.module.css";
import footer from "./footer.module.css";
import palette from "./palette.module.css";

export default function OjolSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.site}>
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

      <footer className={footer.footer}><div className={footer.grid}>
        <div className={footer.intro}><Link href="/ojol" className={footer.brand}><Icon name="mic"/>Ojol Mengaji</Link><p>Belajar di sela perjalanan.</p><small>Pembinaan Al-Qur’an untuk driver ojek online, bersama LAZ Solidaritas Insan Peduli.</small><Link href="/lazsip" className={footer.institution}>Kenali LAZSIP <Icon name="arrowRight"/></Link></div>
        <nav className={footer.column} aria-label="Navigasi footer"><h2>Jelajahi program</h2>{SITE_NAV.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <div className={footer.column}><h2>Ruang belajar</h2><Link href="/ojol/masuk">Masuk dengan kode akun</Link><Link href="/ojol#fitur">Setoran & bimbingan</Link><Link href="/ojol#bergabung">Panduan bergabung</Link><small>Peserta: POM…<br/>Guru: GOM…</small></div>
        <div className={footer.help}><h2>Belum memiliki akun?</h2><p>Admin membantu pendaftaran, penempatan kelompok, dan kendala akses akun.</p><a href={whatsappAdminHref()} className={footer.contact}><Icon name="whatsapp"/>Hubungi admin <Icon name="arrowRight"/></a></div>
        </div><div className={footer.bottom}><span>© {new Date().getFullYear()} Ojol Mengaji · LAZ Solidaritas Insan Peduli</span><Link href="/">Website SIP ↗</Link></div><div className={footer.wordmark} aria-hidden="true">Ojol Mengaji</div></footer>
    </div>
  );
}
