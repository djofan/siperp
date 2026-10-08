import Link from "next/link";
import { Icon } from "@/modules/tanwir/components/icons";
import { buttonClass } from "@/modules/tanwir/components/ui";
import { ROLES, STEPS, whatsappAdminHref } from "@/modules/tanwir/components/site/content";
const display = "font-[family-name:var(--font-tanwir-serif)]";
export default function TanwirHomePage() {
  return <>
    <section className="program-hero">
      <div className="hero-grid">
        <div>
          <p className="hero-eyebrow">Ruang tumbuh guru ngaji</p>
          <h1 className={`${display} hero-title`}>Merawat hafalan.<br /><span>Menyalakan ilmu.</span></h1>
          <p className="hero-copy">Satu ruang untuk menyetor hafalan, belajar bersama pembimbing, dan mencatat perkembangan santri. Langkah kecil hari ini, ilmu yang terus mengalir.</p>
          <div className="hero-actions">
            <Link href="/tanwir/masuk" className={buttonClass("primary", "h-12 px-6")}>Masuk dengan kode akun<Icon name="arrowRight" className="h-4 w-4" /></Link>
            <a href={whatsappAdminHref("Assalamu\'alaikum, saya ingin mendaftar program Tanwir Qurani.")} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "h-12 px-6")}>Belum punya kode?</a>
          </div>
          <div className="hero-signature">
            {/* eslint-disable-next-line @next/next/no-img-element -- Logo lokal, ukuran intrinsik dipertahankan. */}
            <img src="/lazsip-logo.png" alt="LAZ SIP" width={1720} height={602} />
            <span>Program pembinaan<br />LAZ Solidaritas Insan Peduli</span>
          </div>
        </div>
        <div className="hero-art"><svg viewBox="0 0 440 420" fill="none" aria-hidden="true"><path d="M115 254V154a105 105 0 0 1 210 0v100" fill="#49772c"/><path d="M135 265V160a85 85 0 0 1 170 0v105" stroke="#73ae43" strokeWidth="2"/><path d="M220 168c-29-22-58-23-89-10v108c29-13 61-10 89 7 28-17 60-20 89-7V158c-31-13-60-12-89 10Z" fill="#fffef9" stroke="#d4dcc5" strokeWidth="2"/><path d="M220 168v105M150 183c18-4 36-1 52 6M150 204c18-4 36-1 52 6M150 225c18-4 36-1 52 6M238 189c16-7 34-10 52-6M238 210c16-7 34-10 52-6M238 231c16-7 34-10 52-6" stroke="#b0bf9a" strokeWidth="3" strokeLinecap="round"/><path d="M220 270v19l-21-10-76 30M220 270v19l21-10 76 30" stroke="#a55a16" strokeWidth="8" strokeLinecap="round"/><circle cx="327" cy="111" r="21" fill="#f79633"/><path d="m318 111 6 6 12-13" stroke="#fffef9" strokeWidth="2.5"/><path d="m111 92 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#73ae43"/><text x="220" y="375" textAnchor="middle" fill="#49772c" fontSize="11" letterSpacing="4">BELAJAR · MENYETOR · BERTUMBUH</text></svg><div className="art-caption"><span>Tanwir Qurani</span><span>Ilmu yang mengalir</span></div></div>
      </div>
    </section>
    <section aria-label="Alur belajar" className="journey-strip">{STEPS.map((step,index) => <div key={step.title} className="journey-step"><span className="journey-number">0{index+1}</span><div><h2>{step.title}</h2><p>{step.body}</p></div></div>)}</section>
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <p className="section-kicker">Bersama, saling menguatkan</p>
      <h2 className={`${display} section-heading`}>Satu perjalanan belajar.<br />Tiga peran yang terhubung.</h2>
      <div className="feature-grid">{ROLES.map(item => <article key={item.title} className="feature-card"><span className="section-kicker">{item.eyebrow}</span><h3>{item.title}</h3><p>{item.body}</p><ul className="mt-6 space-y-3 text-sm">{item.points.map(point=><li key={point} className="flex gap-2"><Icon name="check" className="h-4 w-4 shrink-0 text-tanwir-primary" />{point}</li>)}</ul></article>)}</div>
    </section>
    <section className="mx-auto max-w-6xl px-6"><div className="closing-note"><div><p className="text-xs uppercase tracking-[.16em] text-[#f79633]">Lanjutkan langkah baikmu</p><h2 className={`${display} mt-3 text-3xl sm:text-4xl`}>Hafalan dijaga. Ilmu dibagikan.</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65">Masuk dengan kode akun dari admin untuk melanjutkan setoran dan melihat perkembangan belajar.</p></div><Link href="/tanwir/masuk" className="inline-flex h-12 items-center gap-3 rounded-full bg-[#f79633] px-6 text-sm font-semibold text-[#213b26]">Masuk sekarang<Icon name="arrowRight" className="h-4 w-4" /></Link></div></section>
  </>;
}
