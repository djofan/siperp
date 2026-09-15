import { getSiteContent } from "@/modules/sip/api/siteContent";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";

export default async function KontakPage() {
  const kontak = await getSiteContent("kontak");
  const whatsapp = process.env.NEXT_PUBLIC_SIP_WHATSAPP;
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin mengajukan bantuan / bertanya seputar SIP.")}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Kontak" title="Hubungi Kami" description="Pengajuan bantuan, kerja sama, atau pertanyaan seputar SIP." />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {kontak?.address && (
          <div className="rounded-2xl border border-sip-primary-100 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-sip-primary-800/50">Alamat</h3>
            <p className="mt-2 text-sm leading-relaxed text-sip-primary-900">{kontak.address}</p>
          </div>
        )}
        {kontak?.email && (
          <div className="rounded-2xl border border-sip-primary-100 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-sip-primary-800/50">Email</h3>
            <p className="mt-2 text-sm leading-relaxed text-sip-primary-900">{kontak.email}</p>
          </div>
        )}
        {kontak?.phone && (
          <div className="rounded-2xl border border-sip-primary-100 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-sip-primary-800/50">Telepon / WhatsApp</h3>
            <p className="mt-2 text-sm leading-relaxed text-sip-primary-900">{kontak.phone}</p>
          </div>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col justify-center rounded-2xl bg-sip-primary-900 p-5 text-white transition-colors hover:bg-sip-primary-800"
          >
            <h3 className="text-xs font-bold uppercase tracking-wide text-white/60">Pengajuan Bantuan</h3>
            <p className="mt-2 text-sm font-semibold">Chat via WhatsApp →</p>
          </a>
        )}
      </div>

      {!kontak?.address && !kontak?.email && !kontak?.phone && !whatsappHref && (
        <p className="mt-10 text-sm text-sip-primary-800/60">Info kontak belum diisi admin.</p>
      )}
    </div>
  );
}
