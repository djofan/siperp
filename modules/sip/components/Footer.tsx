import Link from "next/link";
import { filterNavByHidden, sipSiteConfig } from "@/modules/sip/components/siteConfig";
import { SipMark } from "@/modules/sip/components/SipMark";

const SOCIAL_ICONS = {
  instagram:
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.8A4.2 4.2 0 1 1 7.8 12 4.2 4.2 0 0 1 12 7.8zm0 2A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.5 6a1 1 0 1 1-1 1 1 1 0 0 1 1-1z",
  facebook:
    "M14 22v-8h2.7l.4-3H14V9.1c0-.87.24-1.46 1.5-1.46H17V5.14A20 20 0 0 0 14.66 5C12.3 5 10.7 6.42 10.7 8.8V11H8v3h2.7v8z",
  youtube:
    "M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.6.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8zM10 15.3V8.7l5.5 3.3z",
  tiktok: "M16.6 3c.4 2.2 1.9 3.9 4.4 4.1v3.1a7.6 7.6 0 0 1-4.3-1.4v6.4A6.2 6.2 0 1 1 10.5 9v3.2a3 3 0 1 0 3 3V3h3.1z",
} as const;

const CONTACT_ICONS = {
  address: "M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  phone: "M5 4h3l1.5 4-2 1.2a11 11 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z",
  email: "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm0 1 8 6 8-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
} as const;

function SocialIcon({ href, name }: { href: string; name: keyof typeof SOCIAL_ICONS }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/75 transition-colors hover:bg-white hover:text-sip-primary-900"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d={SOCIAL_ICONS[name]} />
      </svg>
    </a>
  );
}

function ContactRow({ icon, children }: { icon: keyof typeof CONTACT_ICONS; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sip-primary-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d={CONTACT_ICONS[icon]} />
        </svg>
      </span>
      <span className="min-w-0 leading-relaxed">{children}</span>
    </li>
  );
}

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{children}</h3>;
}

export function Footer({
  kontak,
  footer,
  legalitasItems,
  programs,
  hiddenAnchors,
  whatsapp,
}: {
  kontak: Record<string, string>;
  footer: Record<string, string>;
  legalitasItems: string[];
  programs: { slug: string; title: string }[];
  hiddenAnchors: string[];
  whatsapp?: string;
}) {
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin mengajukan bantuan / bertanya seputar SIP.")}`
    : null;
  const nav = [...filterNavByHidden(sipSiteConfig.nav, hiddenAnchors), { label: "Pertanyaan Umum", href: "/pertanyaan-umum" }];
  const showPrograms = footer.showPrograms !== "false" && programs.length > 0;
  const socials = (["instagram", "facebook", "youtube", "tiktok"] as const).filter((name) => kontak[name]);
  const hasContact = kontak.address || kontak.phone || kontak.email || kontak.jamLayanan;

  return (
    <footer className="bg-sip-primary-900 text-sm text-white/65">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-12 pt-14 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-x-8">
        {/* Brand + ajakan */}
        <div className="col-span-2 lg:col-span-4">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <SipMark />
            <span className="text-lg font-semibold leading-tight text-white">{sipSiteConfig.fullName}</span>
          </Link>
          <p className="mt-5 max-w-sm text-lg font-semibold leading-snug tracking-tight text-white">{footer.tagline}</p>
          <p className="mt-2 max-w-sm leading-relaxed">{footer.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-sip-primary-900 transition-colors hover:bg-sip-primary-50"
              >
                {footer.ctaPrimaryLabel}
              </a>
            )}
            {footer.ctaSecondaryUrl && (
              <Link
                href={footer.ctaSecondaryUrl}
                className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15"
              >
                {footer.ctaSecondaryLabel}
              </Link>
            )}
          </div>

          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map((name) => (
                <SocialIcon key={name} href={kontak[name]} name={name} />
              ))}
            </div>
          )}
        </div>

        {/* Navigasi */}
        <div className="lg:col-span-2">
          <ColumnTitle>Navigasi</ColumnTitle>
          <ul className="mt-4 space-y-2.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/berita" className="transition-colors hover:text-white">
                Semua Berita
              </Link>
            </li>
          </ul>
        </div>

        {/* Program — otomatis dari data Program Bantuan */}
        {showPrograms && (
          <div className="lg:col-span-3">
            <ColumnTitle>{footer.programsTitle}</ColumnTitle>
            <ul className="mt-4 space-y-2.5">
              {programs.map((program) => (
                <li key={program.slug}>
                  <Link href={`/program-bantuan/${program.slug}`} className="line-clamp-1 transition-colors hover:text-white">
                    {program.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Kontak */}
        <div className={`col-span-2 ${showPrograms ? "lg:col-span-3" : "lg:col-span-6"}`}>
          <ColumnTitle>Hubungi Kami</ColumnTitle>
          <ul className="mt-4 space-y-3">
            {kontak.address && (
              <ContactRow icon="address">
                {kontak.address}
                {kontak.mapsUrl && (
                  <a
                    href={kontak.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1.5 whitespace-nowrap font-semibold text-white transition-colors hover:text-sip-primary-200"
                  >
                    Lihat di peta ↗
                  </a>
                )}
              </ContactRow>
            )}
            {kontak.phone && (
              <ContactRow icon="phone">
                <a href={`tel:${kontak.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-white">
                  {kontak.phone}
                </a>
              </ContactRow>
            )}
            {kontak.email && (
              <ContactRow icon="email">
                <a href={`mailto:${kontak.email}`} className="break-all transition-colors hover:text-white">
                  {kontak.email}
                </a>
              </ContactRow>
            )}
            {kontak.jamLayanan && <ContactRow icon="clock">{kontak.jamLayanan}</ContactRow>}
            {!hasContact && (
              <li className="leading-relaxed text-white/60">Pengajuan bantuan dan konsultasi tersedia setiap hari melalui WhatsApp.</li>
            )}
          </ul>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-semibold text-white transition-colors hover:text-sip-primary-200"
            >
              Chat via WhatsApp →
            </a>
          )}
        </div>
      </div>

      {/* Legalitas */}
      {legalitasItems.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-8">
            <ColumnTitle>Legalitas</ColumnTitle>
            <ul className="flex flex-1 flex-wrap gap-x-6 gap-y-2">
              {legalitasItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sip-primary-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            {!hiddenAnchors.includes("tentang") && (
              <Link href="/tentang-kami" className="shrink-0 font-semibold text-white transition-colors hover:text-sip-primary-200">
                Info lengkap →
              </Link>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-5 text-center text-xs text-white/45 sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <p>
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          {footer.bottomNote && <p>{footer.bottomNote}</p>}
          <Link href="/admin/sip" className="text-white/60 transition-colors hover:text-white">Login Pengelola</Link>
        </div>
      </div>
    </footer>
  );
}
