import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { buttonClass } from "@/modules/ojol/components/ui";
import { PRINCIPLES, ROUTE_STOPS, whatsappAdminHref } from "@/modules/ojol/components/site/content";

const display = "font-[family-name:var(--font-ojol-display)] font-extrabold tracking-tight";

export default function OjolHomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-ojol-primary-soft px-3 py-1.5 text-xs font-semibold text-ojol-primary">
            Program LAZ Solidaritas Insan Peduli · Bogor
          </p>
          <h1 className={`${display} mt-6 text-balance text-5xl leading-[1.02] sm:text-6xl`}>
            Istirahat narik, <span className="text-ojol-primary">lanjut setoran.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ojol-muted">
            Ojol Mengaji membuat setor hafalan, kuis, dan pantau progres secepat cek order berikutnya — masuk pakai kode akun, rekam, kirim, selesai.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/ojol/masuk" className={buttonClass("primary", "h-12 px-6")}>
              Masuk dengan kode akun
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link href="/ojol/cara-bergabung" className={buttonClass("secondary", "h-12 px-6")}>
              Cara bergabung
            </Link>
          </div>
        </div>

        {/* Gambaran "rute" satu setoran — alur nyata aplikasi, bukan ilustrasi dekoratif */}
        <div className="rounded-3xl bg-ojol-ink p-6 text-white sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Rute hafalan hari ini</p>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-ojol-primary" />
              Aktif
            </span>
          </div>
          <ol className="relative mt-7 space-y-6 pl-8">
            <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-0.5 rounded-full bg-white/15" />
            {[
              { label: "Setoran terkirim", note: "An-Naba 1–16 · voice note 2:10", done: true },
              { label: "Ditinjau guru", note: "Guru mendengarkan & memberi catatan", done: false },
              { label: "Progres tercatat", note: "Dashboard diperbarui otomatis", done: false },
            ].map((stop) => (
              <li key={stop.label} className="relative">
                <span
                  className={`absolute -left-8 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ${stop.done ? "bg-ojol-primary" : "bg-ojol-ink ring-2 ring-white/25"}`}
                >
                  {stop.done && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
                <p className="text-sm font-semibold">{stop.label}</p>
                <p className="mt-0.5 text-sm text-white/60">{stop.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ojol-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-ojol-primary">Cara kerja</p>
          <h2 className={`${display} mt-2 max-w-2xl text-4xl leading-tight`}>Tiga perhentian, satu rute.</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {ROUTE_STOPS.map((stop, index) => (
              <li key={stop.title} className="rounded-3xl bg-ojol-paper p-7">
                <span className={`${display} text-3xl text-ojol-primary`}>{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{stop.title}</h3>
                <p className="mt-2 leading-relaxed text-ojol-muted">{stop.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className={`${display} max-w-2xl text-4xl leading-tight`}>Dirancang untuk jadwal narik, bukan sebaliknya.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map((item) => (
            <article key={item.title} className="rounded-3xl bg-ojol-surface p-7 ring-1 ring-ojol-line">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ojol-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ojol-primary p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div>
            <h2 className={`${display} text-3xl leading-tight sm:text-4xl`}>Sudah punya kode akun?</h2>
            <p className="mt-3 max-w-lg text-white/80">Lanjutkan setoran hari ini. Belum punya? Hubungi admin untuk didaftarkan.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ojol/masuk" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ojol-primary transition-colors hover:bg-ojol-paper">
              Masuk sekarang
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <a href={whatsappAdminHref()} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/10">
              Hubungi admin
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
