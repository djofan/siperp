import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ProgramLoginShell.module.css";

/** Presentation only: module forms keep their own authentication handlers. */
export function ProgramLoginShell({ name, href, tone, heading, description, features, accountHint, helpHref, children }: {
  name: string; href: string; tone: "light" | "green"; heading: string; description: string;
  features: { title: string; description: string }[]; accountHint: string; helpHref: string; children: ReactNode;
}) {
  if (tone === "green") return <section className={`program-login ${styles.shell} ${styles.ojolShell}`} data-tone="green">
    <header className={styles.brand}><Link href={href}>{name}</Link><Link href={href} className={styles.back}>Kembali ke beranda ↗</Link></header>
    <div className={styles.ojolStage}>
      <div className={styles.ojolCard}>
        <aside className={styles.ojolVisual}>
          <span className={styles.ojolSymbol} aria-hidden>✳</span>
          <div><p className={styles.eyebrow}>Mengaji bersama, di sela perjalanan</p><h2>{heading}</h2><p className={styles.description}>{description}</p></div>
          <p className={styles.ojolVisualNote}>Setoran bacaan · Bimbingan guru · Kelompok belajar</p>
        </aside>
        <div className={styles.ojolFormPanel}>
          <p className={styles.eyebrow}>Ruang belajar Ojol Mengaji</p>
          <h1>Selamat datang kembali.</h1>
          <p className={styles.description}>Masuk dengan kode akun dan password dari admin.</p>
          <p className={styles.accountHint}>{accountHint}</p>
          <div className={styles.form}>{children}</div>
          <p className={styles.help}>Butuh bantuan akun? <a href={helpHref} target="_blank" rel="noopener noreferrer">Hubungi admin</a></p>
        </div>
      </div>
    </div>
    <footer className={styles.footer}>Bagian dari SIP Platform · LAZ Solidaritas Insan Peduli</footer>
  </section>;
  return <section className={`program-login ${styles.shell} ${styles.tanwirShell}`} data-tone={tone}>
    <header className={styles.brand}><Link href={href}>{name}</Link><Link href={href} className={styles.back}>Kembali ke beranda ↗</Link></header>
    <div className={`${styles.panels} ${styles.tanwirStage}`}>
      <div className={`${styles.panel} ${styles.formPanel}`}>
        <p className={styles.eyebrow}>Ruang belajar</p>
        <h1>Masuk ke {name}</h1>
        <p className={styles.description}>Lanjutkan belajar dengan akun dari admin program.</p>
        <p className={styles.accountHint}>{accountHint}</p>
        <div className={styles.form}>{children}</div>
        <p className={styles.help}>Lupa kode atau password? <a href={helpHref} target="_blank" rel="noopener noreferrer">Hubungi admin</a></p>
      </div>
      <aside className={`${styles.panel} ${styles.infoPanel}`}>
        <p className={styles.eyebrow}>Tentang program</p>
        <h2>{heading}</h2><p className={styles.description}>{description}</p>
        <ul>{features.map((feature, index) => <li key={feature.title}><span className={styles.step} aria-hidden>{String(index + 1).padStart(2, "0")}</span><div><h3>{feature.title}</h3><p>{feature.description}</p></div></li>)}</ul>
        <p className={styles.note}>Setelah masuk, Anda diarahkan ke dashboard sesuai peran akun: guru atau peserta.</p>
      </aside>
    </div>
    <footer className={styles.footer}>Bagian dari SIP Platform · LAZ Solidaritas Insan Peduli</footer>
  </section>;
}
