import Link from "next/link";
import { Icon, type IconName } from "@/modules/ojol/components/icons";
import { FAQ, JOIN_STEPS, whatsappAdminHref } from "@/modules/ojol/components/site/content";
import s from "./landing.module.css";

const features: { icon: IconName; title: string; body: string; href: string; link: string }[] = [
  { icon: "mic", title: "Setoran hafalan", body: "Kirim rekaman suara atau video dari HP. Belajar di sela aktivitas, sesuai tenggat tugas.", href: "/ojol/masuk", link: "Buka ruang belajar" },
  { icon: "students", title: "Bimbingan guru", body: "Setoran diperiksa pembimbing. Dapatkan catatan untuk membantu memperbaiki bacaan.", href: "#bimbingan", link: "Lihat alurnya" },
  { icon: "quiz", title: "Kuis pembelajaran", body: "Uji pemahaman melalui soal di web. Hasil kuis tercatat bersama aktivitas belajar Anda.", href: "/ojol/masuk", link: "Masuk untuk belajar" },
  { icon: "tasks", title: "Tugas yang terarah", body: "Lihat tugas kelompok, petunjuk pengerjaan, dan batas waktu dalam satu tempat.", href: "#bimbingan", link: "Kenali prosesnya" },
  { icon: "review", title: "Progres pribadi", body: "Periksa hasil tinjauan dan riwayat koreksi. Pahami bagian yang perlu dilatih kembali.", href: "/ojol/tentang", link: "Tentang program" },
  { icon: "whatsapp", title: "Bantuan pengelola", body: "Admin membantu pendaftaran, penempatan kelompok, dan kendala masuk ke akun.", href: "/ojol/kontak", link: "Hubungi pengelola" },
];
export default function OjolHomePage() {
  return <div className={s.landing}>
    <section className={`${s.container} ${s.hero}`}>
      <span className={s.eyebrow}>PEMBINAAN AL-QUR’AN UNTUK DRIVER OJOL</span>
      <h1>Di sela perjalanan,<br/>ada waktu untuk <em>mengaji.</em></h1>
      <p>Terus mencari rezeki, tetap merawat hafalan. Belajar bersama guru pembimbing melalui setoran dan kuis yang bisa Anda akses dari HP.</p>
      <div className={s.heroAccess}><span>Sudah punya kode akun?<small>Lanjutkan pembelajaran Anda.</small></span><Link className={s.button} href="/ojol/masuk">Masuk ruang belajar <Icon name="arrowRight"/></Link></div>
      <Link className={s.heroNote} href="/ojol/cara-bergabung">Baru mengenal program? Lihat cara bergabung <Icon name="arrowRight"/></Link>
      <span className={`${s.orbit} ${s.orbitOne}`} aria-hidden="true"><Icon name="mic"/></span><span className={`${s.orbit} ${s.orbitTwo}`} aria-hidden="true"><Icon name="students"/></span><span className={`${s.orbit} ${s.orbitThree}`} aria-hidden="true"><Icon name="review"/></span>
    </section>
    <section className={s.band} aria-label="Prinsip pembinaan"><div className={s.container}>{[["mic","Setoran dari HP"],["students","Terbimbing oleh guru"],["clock","Di sela aktivitas"],["review","Progres tercatat"]].map(([icon,text])=><span key={text}><Icon name={icon as IconName}/>{text}</span>)}</div></section>
    <section className={`${s.container} ${s.section}`} id="fitur"><header className={s.sectionHeading}><span className={s.eyebrow}>RUANG BELAJAR ANDA</span><h2>Lebih mudah memulai.<br/>Lebih terarah menjalaninya.</h2><p>Dari tugas pertama hingga catatan perbaikan, semua tersambung dalam satu ruang pembinaan.</p></header>
      <div className={s.featureGrid}>{features.map((f,i)=><article className={i===0?s.featureLead:s.featureCard} key={f.title}><Icon name={f.icon}/><h3>{f.title}</h3><p>{f.body}</p><Link href={f.href}>{f.link}<Icon name="arrowRight"/></Link></article>)}</div>
    </section>
    <section className={`${s.container} ${s.mentoring}`} id="bimbingan"><div className={s.processPreview}><span className={s.previewCaption}>ALUR SETORAN · ILUSTRASI</span><div className={s.processDark}><span><Icon name="upload"/>Setoran dikirim</span><small>Suara atau video hafalan</small><Icon name="check"/></div><div className={s.processLight}><span><Icon name="students"/>Tinjauan guru</span><small>Hasil dan arahan perbaikan</small><Icon name="review"/></div><p>Perlu diulang? Baca catatan guru,<br/>lalu kirim perbaikan Anda.</p></div><div className={s.mentoringCopy}><span className={s.eyebrow}>BELAJAR DENGAN ARAHAN</span><h2>Bukan sekadar mengirim.<br/>Ada guru yang membimbing.</h2><p>Buka tugas dari kelompok Anda, ikuti petunjuknya, lalu kumpulkan setoran. Guru meninjau bacaan dan memberi hasil beserta catatan yang dapat Anda lihat kembali.</p><Link href="/ojol/tentang" className={s.button}>Kenali pembinaannya <Icon name="arrowRight"/></Link></div></section>
    <section className={s.startSection} id="bergabung"><div className={s.container}><header className={s.sectionHeading}><span className={s.eyebrow}>LANGKAH PERTAMA</span><h2>Mulai bersama. Tumbuh perlahan.</h2><p>Akun dibuatkan pengelola. Anda cukup menghubungi admin untuk mengetahui proses bergabung.</p></header><ol className={s.steps}>{JOIN_STEPS.map((step,i)=><li key={step.title}><div className={s.stepTop}><span className={s.stepIcon}><Icon name={(["whatsapp", "students", "lock", "mic"] as const)[i]}/></span><span className={s.stepIndex}>LANGKAH 0{i+1}</span></div><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol><div className={s.startAction}><a className={s.button} href={whatsappAdminHref("Assalamu'alaikum, saya ingin mengetahui cara bergabung dalam program Ojol Mengaji.")}><Icon name="whatsapp"/>Tanya admin tentang program <Icon name="arrowRight"/></a><span>Untuk peserta driver ojol dan guru pembimbing.</span></div></div></section>
    <section className={`${s.container} ${s.faqSection}`}><header className={s.sectionHeading}><span className={s.eyebrow}>SEBELUM MEMULAI</span><h2>Masih ada yang ingin ditanyakan?</h2></header><div className={s.faqLayout}><div className={s.faq}>{FAQ.slice(0,5).map(item=><details key={item.q}><summary>{item.q}<Icon name="plus"/></summary><p>{item.a}</p></details>)}<Link href="/ojol/faq" className={s.allFaq}>Lihat semua pertanyaan <Icon name="arrowRight"/></Link></div><aside className={s.helpCard}><Icon name="whatsapp"/><h3>Belum punya akun<br/> atau perlu bantuan?</h3><p>Pengelola siap membantu Anda mengenal program dan proses pendaftarannya.</p><a href={whatsappAdminHref()} className={s.button}>Hubungi admin <Icon name="arrowRight"/></a></aside></div></section>
  </div>;
}
