import Image from "next/image";
import Link from "next/link";
import type { SarsipProfile } from "@/contracts/modules/sarsip";
import { DEFAULT_HERO_IMAGE } from "@/modules/sarsip/brand";

export function SarsipHero({ profile }: { profile: Pick<SarsipProfile, "headline" | "heroImage"> }) {
  return (
    <section className="relative -mt-4 overflow-hidden bg-slate-950 pt-24 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-24 h-96 w-96 rounded-full bg-orange-600/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.25em] text-orange-400">Solidaritas dalam aksi</p>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.1] tracking-tight sm:text-6xl">{profile.headline}</h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300">
            Setiap dukungan berarti bagi upaya pencarian, pertolongan, dan pemulihan. Kenali tim kami dan ambil bagian dalam misi kemanusiaan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sarsip/campaign" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-orange-400">Dukung campaign ↗</Link>
            <Link href="/sarsip/kegiatan" className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold hover:bg-white/10">Lihat kegiatan tim</Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg pb-4 pr-4">
          <div aria-hidden="true" className="absolute inset-0 left-4 top-4 rounded-[2rem] border border-orange-500/40 bg-orange-500/10" />
          <figure className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900 shadow-2xl">
            <Image
              src={profile.heroImage || DEFAULT_HERO_IMAGE}
              alt={profile.heroImage ? "Dokumentasi kegiatan tim SARSIP" : "Ilustrasi wilayah terdampak bencana"}
              width={900}
              height={1000}
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 512px, 100vw"
              preload
              unoptimized={Boolean(profile.heroImage)}
              className="aspect-[5/4] w-full object-cover sm:aspect-[4/3] lg:aspect-[4/5]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-transparent px-6 pb-6 pt-16">
              <span className="mb-2 block h-1 w-10 rounded-full bg-orange-500" />
              <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-400">Kepedulian · Kesiapsiagaan</p>
              <p className="mt-2 text-lg font-semibold">Bersama bergerak untuk sesama.</p>
              {!profile.heroImage && <p className="mt-1 text-xs text-slate-300">Foto ilustrasi tanggap bencana</p>}
            </figcaption>
          </figure>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-5 text-xs font-bold uppercase tracking-[.15em] text-slate-400 sm:px-8">
          <span>Pencarian & pertolongan</span><span>Respons bencana</span><span>Kesiapsiagaan masyarakat</span>
        </div>
      </div>
    </section>
  );
}
