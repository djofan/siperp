import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ProgramLoginShell.module.css";

/** Presentation only: module forms keep their own authentication handlers. */
export function ProgramLoginShell({ name, href, tone, heading, description, features, helpHref, children }: {
  name: string; href: string; tone: "light" | "green"; heading: string; description: string;
  features: { title: string; description: string }[]; helpHref: string; children: ReactNode;
}) {
  return <section className={`program-login ${styles.shell}`} data-tone={tone}>
    <header className={styles.brand}><Link href={href}>{name}</Link><Link href={href} className={styles.back}>Kembali ke beranda ↗</Link></header>
    <div className={styles.panels}>
      <div className={`${styles.panel} ${styles.formPanel}`}>
        <p className={styles.eyebrow}>Masuk ke dashboard</p>
        <h1>Selamat datang kembali.</h1>
        <p className={styles.description}>Gunakan kode akun dan password dari admin untuk melanjutkan.</p>
        <div className={styles.form}>{children}</div>
        <p className={styles.help}>Lupa kode atau password? <a href={helpHref} target="_blank" rel="noopener noreferrer">Hubungi admin</a></p>
      </div>
      <aside className={`${styles.panel} ${styles.infoPanel}`}>
        <p className={styles.eyebrow}>Program LAZ Solidaritas Insan Peduli</p>
        <h2>{heading}</h2><p className={styles.description}>{description}</p>
        <ul>{features.map(feature => <li key={feature.title}><span className={styles.dot} aria-hidden /><div><h3>{feature.title}</h3><p>{feature.description}</p></div></li>)}</ul>
        <p className={styles.note}>Akun dan kelompok dikelola oleh admin program. Masuk dengan akun yang sudah diberikan untuk mengakses ruang belajar.</p>
      </aside>
    </div>
    <footer className={styles.footer}>Bagian dari SIP Platform · LAZ Solidaritas Insan Peduli</footer>
  </section>;
}
