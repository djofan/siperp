import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { buttonClass } from "@/modules/ojol/components/ui";
import { PRINCIPLES, ROUTE_STOPS } from "@/modules/ojol/components/site/content";
const display = "font-[family-name:var(--font-ojol-display)] font-extrabold";
export default function OjolHomePage() {
  return <>
    <section className="program-hero">
      <div className="hero-grid">
        <div>
          <p className="hero-eyebrow">Mengaji di sela perjalanan</p>
          <h1 className={`${display} hero-title`}>Jeda dari jalan.<br /><span>Dekat dengan<br className="hidden lg:block" /> Al-Qur’an.</span></h1>
          <p className="hero-copy">Di antara perjalanan dan menunggu order, selalu ada waktu untuk bertumbuh. Setor hafalan dari HP, ikuti kuis, dan belajar dengan arahan guru pembimbing.</p>
          <div className="hero-actions">
            <Link href="/ojol/masuk" className={buttonClass("primary", "h-12 px-6")}>Masuk dengan kode akun<Icon name="arrowRight" className="h-4 w-4" /></Link>
            <Link href="/ojol/cara-bergabung" className={buttonClass("secondary", "h-12 px-6")}>Cara bergabung</Link>
          </div>
          <div className="hero-signature">
            {/* eslint-disable-next-line @next/next/no-img-element -- Logo lokal, ukuran intrinsik dipertahankan. */}
            <img src="/lazsip-logo.png" alt="LAZ SIP" width={1720} height={602} />
            <span>Program pembinaan<br />LAZ Solidaritas Insan Peduli</span>
          </div>
        </div>
        <div className="hero-art"><svg viewBox="0 0 440 420" fill="none" aria-hidden="true"><path d="M66 342c89 0 69-67 133-67s91-46 91-109 68-79 96-79" stroke="#ffffff25" strokeWidth="48" strokeLinecap="round"/><rect x="126" y="49" width="176" height="285" rx="28" fill="#fffef9" transform="rotate(-7 126 49)"/><rect x="141" y="76" width="147" height="233" rx="17" fill="#eaf1df" transform="rotate(-7 141 76)"/><rect x="169" y="64" width="74" height="9" rx="4.5" fill="#064522" transform="rotate(-7 169 64)"/><circle cx="215" cy="166" r="40" fill="#00b14f"/><path d="M215 175a8 8 0 0 0 8-8v-15a8 8 0 0 0-16 0v15a8 8 0 0 0 8 8ZM199 164v3a16 16 0 0 0 32 0v-3M215 183v10" stroke="#fffef9" strokeWidth="3" strokeLinecap="round"/><path d="M167 236v-12m10 18v-25m10 30v-35m10 22v-16m10 21v-28m10 20v-12m10 19v-30m10 21v-12m10 22v-29m10 18v-11" stroke="#008333" strokeWidth="4" strokeLinecap="round"/><rect x="170" y="260" width="106" height="26" rx="13" fill="#008333" transform="rotate(-7 170 260)"/><path d="M190 271h61" stroke="#fffef9" strokeWidth="2" transform="rotate(-7 190 271)"/><circle cx="334" cy="286" r="29" fill="#d9f7e1"/><path d="m321 286 9 9 18-20" stroke="#064522" strokeWidth="3" strokeLinecap="round"/><circle cx="64" cy="342" r="8" fill="#00b14f"/><circle cx="384" cy="87" r="8" fill="#d9f7e1"/></svg><div className="art-caption"><span>Ojol Mengaji</span><span>Setiap jeda bermakna</span></div></div>
      </div>
    </section>
    <section aria-label="Alur belajar" className="journey-strip">{ROUTE_STOPS.map((step,index) => <div key={step.title} className="journey-step"><span className="journey-number">0{index+1}</span><div><h2>{step.title}</h2><p>{step.body}</p></div></div>)}</section>
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="section-kicker">Belajar mengikuti ritmemu</p>
      <h2 className={`${display} section-heading`}>Jadwal boleh padat.<br />Belajar tetap dapat tempat.</h2>
      <div className="feature-grid">{PRINCIPLES.map((item,index) => <article key={item.title} className="feature-card"><span className="section-kicker">0{index+1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
    </section>
    <section className="mx-auto max-w-6xl px-6"><div className="closing-note"><div><p className="text-xs uppercase tracking-[.16em] text-[#d9f7e1]">Lanjutkan langkah baikmu</p><h2 className={`${display} mt-3 text-3xl sm:text-4xl`}>Satu setoran lagi, hari ini.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65">Masuk dengan kode akun dari admin untuk melanjutkan setoran dan melihat perkembangan belajar.</p></div><Link href="/ojol/masuk" className="inline-flex h-12 items-center gap-3 rounded-full bg-[#d9f7e1] px-6 text-sm font-semibold text-[#213b26]">Masuk sekarang<Icon name="arrowRight" className="h-4 w-4" /></Link></div></section>
  </>;
}
