import { ORGANIZATION_CONTACT } from "@/lib/organization-contact";
import Link from "next/link";
import { serviceLinks } from "./ServiceInfoPage";
import { lazsipSiteConfig } from "@/modules/lazsip/components/siteConfig";
import { LazsipMark } from "@/modules/lazsip/components/LazsipMark";

interface KontakContent {
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

const SOCIAL_ICONS: Record<string, string> = {
  instagram:
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.8A4.2 4.2 0 1 1 7.8 12 4.2 4.2 0 0 1 12 7.8zm0 2A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.5 6a1 1 0 1 1-1 1 1 1 0 0 1 1-1z",
  facebook:
    "M14 22v-8h2.7l.4-3H14V9.1c0-.87.24-1.46 1.5-1.46H17V5.14A20 20 0 0 0 14.66 5C12.3 5 10.7 6.42 10.7 8.8V11H8v3h2.7v8z",
  youtube:
    "M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.6.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8zM10 15.3V8.7l5.5 3.3z",
};

function SocialIcon({ href, name }: { href: string; name: keyof typeof SOCIAL_ICONS }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-lazsip-secondary-500 hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d={SOCIAL_ICONS[name]} />
      </svg>
    </a>
  );
}

export function Footer({
  kontak,
  legalitas,
  whatsapp,
}: {
  kontak: KontakContent;
  legalitas: Record<string, string> | null;
  whatsapp?: string;
}) {
  const legalitasItems = legalitas ? Object.values(legalitas) : [];
  const address = kontak.address?.trim() || ORGANIZATION_CONTACT.address;
  const email = kontak.email?.trim() || ORGANIZATION_CONTACT.email;
  const phone = kontak.phone?.trim() || ORGANIZATION_CONTACT.phone;
  const whatsappNumber = whatsapp?.replace(/\D/g, "") || ORGANIZATION_CONTACT.phoneDigits;
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin bertanya seputar LAZSIP.")}`;
  return (
    <footer className="relative overflow-hidden bg-lazsip-primary-900 text-white/70">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />

      <div className="relative">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div>
            <p className="text-lg font-semibold text-white">
              Mari salurkan kepedulian bersama {lazsipSiteConfig.name}
            </p>
            <p className="mt-1 text-sm text-white/60">Setiap donasi dan zakat Anda tersalurkan tepat sasaran.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/lazsip/zakat"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-lazsip-primary-900 transition-colors hover:bg-lazsip-primary-50"
            >
              Bayar Zakat
            </Link>
            <Link
              href="/lazsip/donasi"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Donasi Sekarang
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-9 px-4 pb-10 pt-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.1fr_0.7fr_1.3fr_1fr]">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <LazsipMark />
            <span className="text-lg font-semibold text-white">{lazsipSiteConfig.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{lazsipSiteConfig.fullName}</p>
          <div className="mt-5 flex gap-2.5">
            {kontak.instagram && <SocialIcon href={kontak.instagram} name="instagram" />}
            {kontak.facebook && <SocialIcon href={kontak.facebook} name="facebook" />}
            {kontak.youtube && <SocialIcon href={kontak.youtube} name="youtube" />}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Navigasi</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {lazsipSiteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={`/lazsip/${item.href}`} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Alamat kantor</h3>
          <p className="mt-4 text-sm font-medium text-white">Solidaritas Insan Peduli</p>
          <address className="mt-2 text-sm not-italic leading-7">{address}</address>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4">
            Lihat lokasi kantor <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Hubungi kami</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><span className="mb-1 block text-xs text-white/50">Email</span><a className="break-words transition-colors hover:text-white" href={`mailto:${email}`}>{email}</a></li>
            <li><span className="mb-1 block text-xs text-white/50">Telepon</span><a className="transition-colors hover:text-white" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></li>
            {whatsappHref && (
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-white transition-colors hover:text-lazsip-secondary-200"
                >
                  Chat via WhatsApp →
                </a>
              </li>
            )}
            <li>
              <Link href="/lazsip/kontak" className="font-semibold text-white transition-colors hover:text-lazsip-secondary-200">
                Info Kontak Lengkap →
              </Link>
            </li>
          </ul>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Legalitas</h3>
          <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {legalitasItems.length > 0 ? (
              legalitasItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lazsip-primary-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))
            ) : (
              <li className="leading-relaxed text-white/60">
                {lazsipSiteConfig.name} adalah {lazsipSiteConfig.fullName.toLowerCase()}, bernaung di bawah Yayasan
                Solidaritas Insan Peduli.
              </li>
            )}

          </ul>
        </div>
      </div>

      <div className="relative">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-xs text-white/45 sm:flex-row sm:justify-between sm:px-6">
          <nav aria-label="Bantuan dan kebijakan" className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-white/80">
            {serviceLinks.map(link => <Link key={link.href} href={link.href} className="hover:text-white">{link.label}</Link>)}
          </nav>
          <p>
            © {new Date().getFullYear()} {lazsipSiteConfig.name}. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
