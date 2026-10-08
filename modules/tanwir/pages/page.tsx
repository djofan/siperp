import Link from "next/link";
import { Icon } from "@/modules/tanwir/components/icons";
import { buttonClass } from "@/modules/tanwir/components/ui";
import { ROLES, STEPS, whatsappAdminHref } from "@/modules/tanwir/components/site/content";

const serif = "font-[family-name:var(--font-tanwir-serif)]";

export default function TanwirHomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tanwir-gold">Program LAZ Solidaritas Insan Peduli</p>
          <h1 className={`${serif} mt-5 text-balance text-5xl leading-[1.05] tracking-tight sm:text-6xl`}>
            Setoran hafalan lebih mudah, <em className="text-tanwir-primary">progres lebih jelas.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-tanwir-muted">
            Tanwir Qurani membantu guru ngaji TPQ menyetor hafalan, mengerjakan kuis, dan mencatat perkembangan santri — sementara guru
            pembimbing meninjau dan memberi catatan dari mana saja.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/tanwir/masuk" className={buttonClass("primary", "h-12 px-6")}>
              Masuk dengan kode akun
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <a href={whatsappAdminHref("Assalamu'alaikum, saya ingin mendaftar program Tanwir Qurani.")} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "h-12 px-6")}>
              Belum punya kode?
            </a>
          </div>
        </div>

        {/* Gambaran alur nyata satu setoran, bukan ilustrasi dekoratif */}
        <div className="rounded-3xl bg-tanwir-surface p-6 shadow-[0_30px_80px_-40px_rgba(22,33,29,0.35)] ring-1 ring-tanwir-line sm:p-8">
          <p className="text-xs font-medium text-tanwir-muted">Setoran hari ini</p>
          <p className="mt-1 font-medium">Hafalan Surah Al-Mulk ayat 1–10</p>
          <ol className="mt-6 space-y-5">
            {[
              { label: "Rekaman terkirim", note: "Voice note · 2 menit 14 detik", tone: "bg-tanwir-success text-white", icon: "check" as const },
              { label: "Ditinjau guru", note: "Guru mendengarkan & memberi catatan", tone: "bg-tanwir-warning-soft text-tanwir-warning", icon: "clock" as const },
              { label: "Progres tercatat", note: "Dashboard diperbarui otomatis", tone: "bg-tanwir-paper text-tanwir-muted ring-1 ring-tanwir-line", icon: "review" as const },
            ].map((step) => (
              <li key={step.label} className="flex gap-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${step.tone}`}>
                  <Icon name={step.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="mt-0.5 text-sm text-tanwir-muted">{step.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-tanwir-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className={`${serif} max-w-2xl text-4xl leading-tight tracking-tight`}>Tiga langkah, satu alur yang rapi.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="text-sm font-medium tabular-nums text-tanwir-gold">0{index + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-tanwir-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className={`${serif} max-w-2xl text-4xl leading-tight tracking-tight`}>Satu platform untuk tiga peran.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ROLES.map((role) => (
            <article key={role.eyebrow} className="flex flex-col rounded-3xl bg-tanwir-surface p-7 ring-1 ring-tanwir-line">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-tanwir-gold">{role.eyebrow}</p>
              <h3 className="mt-3 text-xl font-semibold">{role.title}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-tanwir-muted">{role.body}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-tanwir-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-tanwir-primary p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div>
            <h2 className={`${serif} text-3xl leading-tight sm:text-4xl`}>Siap melanjutkan setoran?</h2>
            <p className="mt-3 max-w-lg text-white/75">Terbuka untuk peserta dan guru aktif program Tanwir Qurani. Masuk dengan kode akun dari admin.</p>
          </div>
          <Link href="/tanwir/masuk" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-tanwir-primary transition-colors hover:bg-tanwir-paper">
            Masuk sekarang
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
