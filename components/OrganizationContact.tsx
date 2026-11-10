import { ORGANIZATION_CONTACT as contact } from "@/lib/organization-contact";

/** Kontak kantor pusat; kontak outlet/program tetap dapat ditampilkan terpisah. */
export function OrganizationContact({ className = "" }: { className?: string }) {
  const linkStyle = "inline-block break-all underline decoration-current/30 underline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4";
  return <section aria-label="Kontak resmi Solidaritas Insan Peduli" className={`mx-auto w-full max-w-6xl px-5 py-6 text-sm sm:px-6 ${className}`}>
    <h2 className="text-sm font-semibold">Kantor pusat · {contact.name}</h2>
    <div className="mt-3 grid min-w-0 gap-5 leading-relaxed md:grid-cols-2">
      <div><p className="not-italic">{contact.address}</p><a className={`${linkStyle} mt-2`} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`} target="_blank" rel="noopener noreferrer">Lihat lokasi kantor ↗</a></div>
      <div className="flex min-w-0 flex-col items-start gap-2"><a className={linkStyle} href={`mailto:${contact.email}`}>{contact.email}</a><a className={linkStyle} href={`tel:+${contact.phoneDigits}`}>{contact.phone}</a><a className={linkStyle} href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">Hubungi melalui WhatsApp ↗</a></div>
    </div>
  </section>;
}
