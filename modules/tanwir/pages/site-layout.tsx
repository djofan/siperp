import { OrganizationContact } from "@/components/OrganizationContact";
import Link from "next/link";
import { Wordmark } from "@/modules/tanwir/components/Wordmark";
import { Icon } from "@/modules/tanwir/components/icons";
import { SITE_NAV, whatsappAdminHref } from "@/modules/tanwir/components/site/content";
import s from "./site.module.css";
import f from "./footer.module.css";

export default function TanwirSiteLayout({children}:{children:React.ReactNode}){return <div className={s.site}>
  <header className={s.header}><div className={s.navigation}><Wordmark className={s.brand}/><nav className={s.desktopNav} aria-label="Navigasi situs">{SITE_NAV.map(item=><Link href={item.href} key={item.href}>{item.label}</Link>)}</nav><div className={s.navActions}><Link href="/tanwir/masuk" className={s.login}>Masuk akun <Icon name="arrowRight"/></Link><details className={s.mobileMenu}><summary aria-label="Buka menu navigasi"><Icon name="menu"/></summary><nav aria-label="Navigasi situs seluler">{SITE_NAV.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav></details></div></div></header>
  <main className={s.main}>{children}</main>
  <footer className={f.footer}><div className={f.inner}>
    <div className={f.grid}>
      <div className={f.identity}><Link href="/tanwir" className={f.wordmark}>Tanwir <span>Qurani</span></Link><p>Pembinaan Qur’an untuk guru ngaji TPQ.</p><small>Merawat hafalan bersama pembimbing dan mendukung perkembangan santri yang Anda ajar.</small><Link href="/lazsip" className={f.institution}>Program LAZ Solidaritas Insan Peduli <Icon name="arrowRight"/></Link></div>
      <nav className={f.column} aria-label="Informasi program Tanwir"><h2>Program</h2>{SITE_NAV.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}<Link href="/tanwir#alur">Cara bergabung</Link></nav>
      <nav className={f.column} aria-label="Akses akun Tanwir"><h2>Akses belajar</h2><Link href="/tanwir/masuk">Masuk akun <Icon name="arrowRight"/></Link><Link href="/tanwir#fitur">Fitur pembelajaran</Link><div className={f.codes}><span>Peserta <code>PTQ…</code></span><span>Guru PIC <code>GTQ…</code></span></div><small>Gunakan kode dan password dari admin.</small></nav>
      <div className={f.help}><span className={f.helpIcon}><Icon name="whatsapp"/></span><h2>Perlu bantuan?</h2><p>Informasi pendaftaran, kode akun, atau lupa password? Hubungi pengelola program.</p><a href={whatsappAdminHref()} className={f.contact}>Hubungi admin <Icon name="arrowRight"/></a></div>
    </div>
    <OrganizationContact/><div className={f.bottom}><span>© {new Date().getFullYear()} Tanwir Qurani · LAZ Solidaritas Insan Peduli</span><Link href="/">Website SIP <Icon name="arrowRight"/></Link></div>
  </div></footer>
</div>;}
