import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function LazsipKontakPage() {
  const kontak = await getSiteContent("kontak");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip">Kembali ke Beranda</BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        Kontak
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Hubungi Kami
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
        Ada pertanyaan seputar zakat, donasi, atau program kami? Chat langsung lewat WhatsApp, atau kunjungi kantor
        kami.
      </p>

      <div className="mt-10 flex flex-col gap-5">
        {kontak?.address && (
          <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-lazsip-primary-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5 text-lazsip-primary-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
              Alamat Kantor
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-lazsip-primary-800/70">{kontak.address}</p>
          </div>
        )}

        <div className="rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-6">
          <h2 className="text-base font-bold text-lazsip-primary-900">Kontak Langsung</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-lazsip-primary-800/75">
            {kontak?.email && <li>{kontak.email}</li>}
            {kontak?.phone && <li>{kontak.phone}</li>}
            {!kontak?.email && !kontak?.phone && <li>Info kontak belum diisi lewat halaman admin Konten Umum.</li>}
          </ul>
          {process.env.NEXT_PUBLIC_LAZSIP_WHATSAPP && (
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_LAZSIP_WHATSAPP}?text=${encodeURIComponent(
                "Assalamu'alaikum, saya ingin bertanya seputar LAZSIP."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.08 1-2.37.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.81 2 .88 2.15.07.15.12.32.02.52-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.37 1.47.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.14.48.21.55.33.07.12.07.7-.17 1.37z" />
              </svg>
              Chat via WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
