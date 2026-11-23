import { formatNumericText } from "@/lib/number-format";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Radio, LifeBuoy, ScrollText, HeartHandshake } from "lucide-react";
import type { SarsipProfile } from "@/contracts/modules/sarsip";
import { TopoPattern } from "./TopoPattern";
import styles from "./Landing.module.css";

const commitments = [
  { icon: LifeBuoy, title: "Aksi kemanusiaan", description: "Kenali kegiatan pencarian, pertolongan, dan kepedulian tim di lapangan." },
  { icon: ScrollText, title: "Informasi terbuka", description: "Ikuti kabar tim, dokumentasi bantuan, dan ringkasan dukungan yang masuk." },
  { icon: HeartHandshake, title: "Bergerak bersama", description: "Ambil bagian melalui campaign bantuan yang dipublikasikan SARSIP." },
];

const focusAreas = [
  { title: "Pencarian & pertolongan", description: "Dukungan pencarian dan evakuasi bagi warga yang membutuhkan pertolongan." },
  { title: "Respons bencana", description: "Aksi kemanusiaan untuk membantu warga di wilayah terdampak bencana." },
  { title: "Kebutuhan dasar", description: "Bantuan pangan, air bersih, dan perlengkapan untuk kebutuhan sehari-hari." },
  { title: "Pemulihan warga", description: "Dukungan bagi keluarga untuk kembali menjalani aktivitas setelah bencana." },
];
export function SarsipHero({ profile }: {
  profile: Pick<SarsipProfile, "headline" | "heroImage">;
}) {
  return <section className={styles.hero}>
    {profile.heroImage && <Image src={profile.heroImage} alt="Dokumentasi kegiatan tim SARSIP" fill unoptimized preload sizes="100vw" className={styles.heroBackdrop}/>}
    <TopoPattern className={styles.topography} id="sarsip-hero-topography"/>
    <div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <p className={styles.heroBadge}><Radio size={14} aria-hidden="true"/> Tim SAR Solidaritas Insan Peduli</p>
        <h1>{profile.headline}</h1>
        <p className={styles.heroDescription}>Setiap dukungan berarti bagi upaya pencarian, pertolongan, dan pemulihan. Kenali tim kami dan ambil bagian dalam misi kemanusiaan.</p>
        <div className={styles.actions}>
          <Link href="/sarsip#campaign" className={styles.primary}>Salurkan bantuan <ArrowRight size={17} aria-hidden="true"/></Link>
          <Link href="/sarsip/kegiatan" className={styles.secondary}>Lihat kegiatan tim <ArrowRight size={17} aria-hidden="true"/></Link>
        </div>
        <p className={styles.heroNote}><LifeBuoy size={15} aria-hidden="true"/> Pencarian, pertolongan, dan aksi kemanusiaan</p>
      </div>
      <div className={styles.heroFocus} aria-label="Fokus bantuan SARSIP">{focusAreas.map(({ title, description }, index) => <div key={title}><span aria-hidden="true">0{formatNumericText(index + 1)}</span><h2>{title}</h2><p>{description}</p></div>)}</div>
      <div className={styles.heroCommitments} aria-label="Tentang kegiatan SARSIP">{commitments.map(({ icon: Icon, title, description }) => <div key={title}><span><Icon size={20} aria-hidden="true"/></span><div><h2>{title}</h2><p>{description}</p></div></div>)}</div>
    </div>
  </section>;
}
