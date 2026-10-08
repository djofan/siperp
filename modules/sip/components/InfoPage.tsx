import Link from "next/link";
import { BackButton } from "@/modules/sip/components/ui/BackButton";

export function InfoPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="pb-16 pt-28 sm:pb-24 sm:pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Tombol kembali ke halaman asal (mis. footer beranda), fallback ke beranda. */}
        <BackButton />
        <header className="mb-10 mt-6 max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-sip-primary-900 sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-sip-primary-900/60">{description}</p>
        </header>
        {children}
      </div>
    </article>
  );
}

const INFO_LINKS = [
  { href: "/tentang-kami", label: "Profil Yayasan" },
  { href: "/layanan", label: "Layanan & Program" },
  { href: "/pertanyaan-umum", label: "Pertanyaan Umum" },
  { href: "/kontak", label: "Hubungi Kami" },
];

// `current` = halaman yang sedang dibuka, supaya tidak menautkan ke dirinya sendiri.
export function InfoLinks({ current }: { current?: string }) {
  const links = INFO_LINKS.filter((link) => link.href !== current);
  return (
    <aside className="mt-12 rounded-3xl bg-sip-primary-900 p-7 text-white sm:p-9">
      <h2 className="text-2xl font-semibold">Kenali SIP lebih dekat</h2>
      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white hover:text-sip-primary-900"
          >
            {link.label} →
          </Link>
        ))}
      </div>
    </aside>
  );
}
