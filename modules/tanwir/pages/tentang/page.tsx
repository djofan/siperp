import Link from "next/link";
import { PageIntro } from "@/modules/tanwir/components/site/PageIntro";
import { VALUES } from "@/modules/tanwir/components/site/content";
import { buttonClass } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Tentang" };

const JOURNEY = [
  {
    when: "Sebelum digitalisasi",
    title: "Pencatatan manual per kelompok",
    body: "Guru mencatat setoran hafalan secara manual dan merekapnya berkala untuk dilaporkan ke pengurus LAZ SIP. Rawan tercecer dan progres sulit terlihat.",
  },
  {
    when: "Tahap awal",
    title: "Setoran hafalan secara digital",
    body: "Peserta mengirim setoran suara dan video langsung dari browser; guru meninjau tanpa perlu bertemu langsung.",
  },
  {
    when: "Sekarang",
    title: "Satu sistem, tiga peran terhubung",
    body: "Admin, guru PIC, dan peserta berjalan dalam satu alur — dari setoran, koreksi, kuis, sampai catatan anak didik di tiap TPQ.",
  },
];

export default function TanwirAboutPage() {
  return (
    <>
      <PageIntro eyebrow="Tentang" title="Pembinaan Qur'an yang tetap tertata, meski jarak memisahkan.">
        Tanwir Qurani lahir dari kebutuhan sederhana: guru dan peserta program tahfizh LAZ SIP tersebar di banyak tempat, tetapi progres
        hafalan tetap harus bisa dipantau satu per satu.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <ol className="grid gap-5 md:grid-cols-3">
          {JOURNEY.map((step) => (
            <li key={step.when} className="rounded-3xl bg-tanwir-surface p-7 ring-1 ring-tanwir-line">
              <p className="text-xs font-medium text-tanwir-gold">{step.when}</p>
              <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 leading-relaxed text-tanwir-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-[family-name:var(--font-tanwir-serif)] text-4xl tracking-tight">Nilai yang kami pegang</h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title}>
              <dt className="text-lg font-semibold">{value.title}</dt>
              <dd className="mt-2 leading-relaxed text-tanwir-muted">{value.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl bg-tanwir-surface p-8 ring-1 ring-tanwir-line sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-tanwir-gold">LAZ Solidaritas Insan Peduli</p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">
            Tanwir Qurani adalah salah satu program digital LAZ SIP untuk mendukung pembinaan Qur&apos;an masyarakat binaan.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/tanwir/program" className={buttonClass("primary")}>
              Lihat program
            </Link>
            <Link href="/tanwir/kontak" className={buttonClass("secondary")}>
              Hubungi kami
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
