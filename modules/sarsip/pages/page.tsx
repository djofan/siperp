import { previewEntries } from "@/modules/sarsip/components/landingPreview";
import Image from "next/image";
import Link from "next/link";
import styles from "@/modules/sarsip/components/Landing.module.css";
import { SarsipHero } from "@/modules/sarsip/components/Hero";
import { getProfile, listEntries, KINDS } from "@/modules/sarsip/api/data";
import { getTransparency } from "@/modules/sarsip/api/beneficiaries";
import { EntryCard } from "@/modules/sarsip/components/EntryCard";
import { Transparency } from "@/modules/sarsip/components/Transparency";
import { BeneficiariesSection } from "@/modules/sarsip/components/BeneficiariesSection";
export default async function SarsipHome() {
  const [profile, entries, stats] = await Promise.all([getProfile(), listEntries(), getTransparency()]);
  const showPreview = process.env.NODE_ENV === "development";
  const orderedKinds = ["campaign", ...KINDS.filter((kind) => kind !== "campaign")];
  return <div className={styles.home}>
    <SarsipHero profile={profile}/>

    {orderedKinds.map((kind) => {
      const published = entries.filter((entry) => entry.kind === kind).slice(0, kind === "campaign" ? undefined : 8);
      const items = [...published, ...(showPreview ? previewEntries(kind).slice(0, Math.max(0, 8 - published.length)) : [])];
      return <section id={kind} key={kind} className={styles.entrySection}><div className={styles.sectionInner}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{kind === "campaign" ? "Program bantuan" : kind === "kegiatan" ? "Catatan lapangan" : "Kabar dari tim"}</p><h2>{kind === "campaign" ? "Pilih misi yang ingin Anda dukung" : kind === "kegiatan" ? "Kegiatan tim SARSIP" : "Berita terbaru"}</h2><p className={styles.sectionDescription}>{kind === "campaign" ? "Salurkan kepedulian melalui campaign kemanusiaan SARSIP." : kind === "kegiatan" ? "Dokumentasi kerja tim dan aksi kepedulian di lapangan." : "Ikuti informasi dan perkembangan terbaru dari tim."}</p></div><span className={styles.sectionCount}>{String(items.length).padStart(2, "0")} {kind === "campaign" ? "campaign" : kind === "kegiatan" ? "kegiatan" : "berita"}</span></div>
        {showPreview && published.length < 8 && <p className={styles.previewNotice}>Pratinjau desain · Card berlabel contoh menggunakan data dan foto ilustrasi.</p>}
        {items.length ? <div className={styles.entryGrid}>{items.map((entry) => <EntryCard key={entry.id} entry={entry}/>)}</div> : <p className={styles.empty}>Belum ada {kind} yang dipublikasikan. Informasi terbaru akan tersedia di sini.</p>}
        {kind !== "campaign" && <div className={styles.sectionFooter}><Link href={`/sarsip/${kind}`} className={styles.outline}>Lihat semua {kind === "campaign" ? "campaign" : kind} <span aria-hidden="true">→</span></Link></div>}
      </div></section>;
    })}
    <BeneficiariesSection preview={showPreview}/>
    <Transparency summary={stats} intro={
    <div id="tentang" className={styles.aboutMerged}>
      <p className={styles.eyebrow}>Tentang SARSIP</p><h2>Solidaritas yang bergerak bersama.</h2>
      <div className={`${styles.aboutContent} ${profile.heroImage ? styles.withPhoto : ""}`}>
        {profile.heroImage && <Image src={profile.heroImage} alt="Dokumentasi kegiatan tim SARSIP" width={800} height={550} unoptimized sizes="(min-width: 768px) 50vw, 100vw"/>}
        <div><p className={styles.aboutDescription}>{profile.description}</p><div className={styles.aboutLinks}><Link className={styles.outline} href="/sarsip/kegiatan">Kenali kegiatan tim →</Link><Link className={styles.outline} href="/sarsip/berita">Baca kabar terbaru →</Link></div></div>
      </div>
    </div>
    }/>
  </div>;
}
