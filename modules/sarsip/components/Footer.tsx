import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { ORGANIZATION_CONTACT as contact } from "@/lib/organization-contact";
import { SarsipMark } from "./SarsipMark";
import styles from "./Landing.module.css";

const links = [
  ["Tentang tim", "/sarsip#tentang"],
  ["Campaign donasi", "/sarsip#campaign"],
  ["Berita terbaru", "/sarsip/berita"],
  ["Bantuan tersalurkan", "/sarsip/penerima-manfaat"],
  ["Transparansi", "/sarsip#transparansi"],
];

export function Footer({ teamContact }: { teamContact: string | null }) {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div className={styles.footerGrid}>
        <div className={styles.footerIdentity}>
          <Link href="/sarsip" className={styles.footerBrand} aria-label="Beranda SARSIP">
            <SarsipMark className={styles.footerLogo}/>
            <span>SAR<span>SIP</span><small>SEARCH & RESCUE</small></span>
          </Link>
          <p>Tim SAR Solidaritas Insan Peduli. Bersama dalam pencarian, pertolongan, dan aksi kemanusiaan.</p>
          <Link href="/" className={styles.footerOrganization}>Bagian dari Solidaritas Insan Peduli <ArrowUpRight size={14} aria-hidden="true"/></Link>
        </div>
        <nav className={styles.footerLinks} aria-label="Navigasi footer SARSIP">
          <h2>Jelajahi SARSIP</h2>
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <section className={styles.footerAddress} aria-label="Alamat kantor pusat">
          <h2>Kantor pusat</h2>
          <p className={styles.footerOffice}>{contact.name}</p>
          <address>{contact.address}</address>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`} target="_blank" rel="noopener noreferrer" className={styles.footerMap}><MapPin size={15} aria-hidden="true"/> Lihat di Google Maps <ArrowUpRight size={13} aria-hidden="true"/></a>
        </section>
        <section className={styles.footerContact} aria-label="Kontak dan koordinasi">
          <h2>Hubungi kami</h2>
          <a href={`mailto:${contact.email}`}><Mail size={16} aria-hidden="true"/><span>{contact.email}</span></a>
          <a href={`tel:+${contact.phoneDigits}`}><Phone size={16} aria-hidden="true"/><span>{contact.phone}</span></a>
          <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.footerWhatsapp}><MessageCircle size={16} aria-hidden="true"/> Hubungi WhatsApp <ArrowUpRight size={14} aria-hidden="true"/></a>
          {teamContact?.trim() && <div className={styles.footerTeam}><h3>Koordinasi tim SARSIP</h3><p>{teamContact}</p></div>}
        </section>
      </div>
      <div className={styles.footerBottom}><p>© {new Date().getFullYear()} Solidaritas Insan Peduli · SARSIP</p><span>Bergerak bersama untuk kemanusiaan.</span></div>
    </div>
  </footer>;
}
