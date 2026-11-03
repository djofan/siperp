import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "./ui/BackLink";
import { getSiteContent } from "../api/siteContent";
import { getWhatsAppNumber } from "../api/contact";
import s from "./ServiceInfoPage.module.css";

export const serviceLinks = [
  { href: "/lazsip/faq", label: "Pertanyaan umum" },
  { href: "/lazsip/refund-policy", label: "Kebijakan pengembalian dana" },
  { href: "/lazsip/terms-and-conditions", label: "Syarat & ketentuan" },
  { href: "/lazsip/kontak", label: "Kontak" },
];

export async function ServiceInfoPage({ title, introduction, active, children }: {
  title: string; introduction: string; active: string; children: ReactNode;
}) {
  const contact = await getSiteContent("kontak");
  const whatsapp = getWhatsAppNumber(contact?.phone);
  return <div className={s.page}>
    <BackLink href="/lazsip">Kembali ke beranda</BackLink>
    <header className={s.header}><span>Layanan donatur</span><h1>{title}</h1><p>{introduction}</p></header>
    <div className={s.layout}>
      <aside className={s.sidebar}><nav aria-label="Informasi layanan">{serviceLinks.map(link => <Link key={link.href} href={link.href} aria-current={active===link.href?"page":undefined}>{link.label}</Link>)}</nav>
        <div className={s.contact}><h2>Butuh bantuan?</h2><p>Hubungi pengelola LAZSIP melalui kanal resmi berikut.</p>
          {contact?.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact?.phone && <p>Telepon: {contact.phone}</p>}
          {contact?.address && <p className={s.address}>{contact.address}</p>}
          {whatsapp && <a className={s.whatsapp} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">Hubungi via WhatsApp ↗</a>}
          <Link href="/lazsip/kontak">Lihat kontak lengkap →</Link>
        </div>
      </aside>
      <article className={s.content}>{children}</article>
    </div>
  </div>;
}
