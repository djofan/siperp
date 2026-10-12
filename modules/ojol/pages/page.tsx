import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { FAQ, JOIN_STEPS, PRINCIPLES, ROUTE_STOPS } from "@/modules/ojol/components/site/content";
import styles from "./landing.module.css";
import palette from "./palette.module.css";

export default function OjolHomePage() {
  return (
    <div className={`${palette.theme} ${styles.landing}`}>
      <section className={styles.hero}>
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div>
            <span className={styles.badge}>Program pembinaan Al-Qur’an · LAZ SIP</span>
            <h1>Perjalanan tetap jalan.<br /><span>Mengaji tetap dekat.</span></h1>
            <p>Ruang belajar untuk driver ojek online. Kirim hafalan, ikuti kuis, dan dapatkan bimbingan guru—langsung dari HP Anda.</p>
            <div className={styles.actions}>
              <Link href="/ojol/masuk" className={styles.primary}>Masuk ruang belajar <Icon name="arrowRight" /></Link>
              <Link href="/ojol/cara-bergabung" className={styles.secondary}>Cara bergabung</Link>
            </div>
            <ul className={styles.checks}>{PRINCIPLES.map(item => <li key={item.title}><Icon name="check" />{item.title}</li>)}</ul>
          </div>
          <div className={styles.infoPanel}>
            <p className={styles.panelEyebrow}>BELAJAR SESUAI RITMEMU</p>
            <h2>Mulai dari satu setoran.</h2>
            <div className={styles.infoList}>
              <article><Icon name="mic" /><div><h3>Setoran suara & video</h3><p>Rekam langsung dari HP atau unggah hafalan Anda.</p></div></article>
              <article><Icon name="quiz" /><div><h3>Kuis pilihan ganda</h3><p>Kerjakan kuis sesuai tugas dari guru pembimbing.</p></div></article>
              <article><Icon name="review" /><div><h3>Catatan dari guru</h3><p>Lihat hasil tinjauan dan bagian yang perlu diperbaiki.</p></div></article>
            </div>
            <div className={styles.accountInfo}><span>Akses dengan kode akun</span><div><span><strong>POM</strong> Peserta</span><span><strong>GOM</strong> Guru</span></div><p>Akun dan kelompok dibuatkan oleh admin.</p></div>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <section className={styles.benefits} aria-label="Manfaat program">
          {PRINCIPLES.map((item, i) => <article key={item.title}><Icon name={(["students", "clock", "tasks"] as const)[i]} /><div><h2>{item.title}</h2><p>{item.body}</p></div></article>)}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>BELAJAR BERSAMA OJOL MENGAJI</p><h2>Setoran sederhana. Bimbingan yang terarah.</h2></div><Link href="/ojol/tentang" className={styles.link}>Tentang program <Icon name="arrowRight" /></Link></div>
          <div className={styles.flow}>{ROUTE_STOPS.map((item, i) => <article key={item.title}><span className={styles.number}>0{i + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </section>

        <section className={styles.join}>
          <div><p className={styles.eyebrow}>MULAI DARI SINI</p><h2>Belum punya<br />kode akun?</h2><p>Peserta dan guru didaftarkan oleh admin. Ikuti langkah berikut untuk mulai belajar bersama.</p><Link href="/ojol/cara-bergabung" className={styles.greenButton}>Panduan bergabung <Icon name="arrowRight" /></Link></div>
          <ol>{JOIN_STEPS.map((item, i) => <li key={item.title}><span>{i + 1}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></li>)}</ol>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`}>
          <div><p className={styles.eyebrow}>TANYA JAWAB</p><h2>Informasi sebelum<br />Anda memulai.</h2><Link href="/ojol/faq" className={styles.link}>Semua pertanyaan <Icon name="arrowRight" /></Link></div>
          <div className={styles.faq}>{FAQ.slice(0, 4).map(item => <details key={item.q}><summary>{item.q}<Icon name="plus" /></summary><p>{item.a}</p></details>)}</div>
        </section>

        <section className={styles.cta}><div><p className={styles.ctaLabel}>RUANG BELAJAR OJOL MENGAJI</p><h2>Jadikan jeda hari ini lebih berarti.</h2><p>Lanjutkan setoran dan lihat catatan guru dalam satu tempat.</p></div><div className={styles.ctaActions}><Link href="/ojol/masuk" className={styles.greenButton}>Masuk ruang belajar <Icon name="arrowRight" /></Link><span>Gunakan kode akun dari admin.</span></div></section>
      </div>
    </div>
  );
}
