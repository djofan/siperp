import Link from "next/link";
import { PageIntro } from "@/modules/ojol/components/site/PageIntro";
import { PRINCIPLES } from "@/modules/ojol/components/site/content";
import { buttonClass } from "@/modules/ojol/components/ui";

export const metadata = { title: "Tentang" };

export default function OjolAboutPage() {
  return (
    <>
      <PageIntro eyebrow="Tentang kami" title="Program digital untuk ojol yang istiqomah.">
        Ojol Mengaji dibangun supaya driver yang waktunya habis di jalan tetap punya ruang rutin untuk menjaga hafalan Qur&apos;an — tanpa harus
        datang ke majelis setiap hari.
      </PageIntro>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl bg-ojol-surface p-8 ring-1 ring-ojol-line">
          <h2 className="text-xl font-semibold">Setoran yang mengikuti jadwal narik</h2>
          <p className="mt-3 leading-relaxed text-ojol-muted">
            Waktu luang driver ojek online sering datang di jam yang tidak menentu — saat ngetem, menunggu penumpang, atau jeda antar order.
            Ojol Mengaji dirancang supaya setoran bisa dikirim kapan pun ada jeda itu, lalu ditinjau guru pembimbing dari mana saja.
          </p>
        </article>
        <article className="rounded-3xl bg-ojol-ink p-8 text-white">
          <p className="text-sm font-semibold text-ojol-primary-soft">LAZ Solidaritas Insan Peduli</p>
          <p className="mt-3 leading-relaxed text-white/80">
            Ojol Mengaji adalah program digital LAZ SIP yang berbasis di Bogor, Jawa Barat — terbuka untuk driver ojek online dan guru/musyrif
            yang terdaftar.
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-[family-name:var(--font-ojol-display)] text-4xl font-extrabold tracking-tight">Prinsip kami</h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {PRINCIPLES.map((item) => (
            <div key={item.title}>
              <dt className="text-lg font-semibold">{item.title}</dt>
              <dd className="mt-2 leading-relaxed text-ojol-muted">{item.body}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/ojol/cara-bergabung" className={buttonClass("primary")}>
            Cara bergabung
          </Link>
          <Link href="/ojol/kontak" className={buttonClass("secondary")}>
            Hubungi kami
          </Link>
        </div>
      </section>
    </>
  );
}
