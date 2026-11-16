import type { SarsipGalleryPhoto } from "@/contracts/modules/sarsip";
import styles from "./SarsipGallery.module.css";
export function SarsipGallery({ photos, title, kind = "campaign" }: { photos: SarsipGalleryPhoto[]; title: string; kind?: "campaign" | "activity" | "program" | "news" | "distribution" }) {
  if (!photos.length) return null;
  const category = kind === "news" ? "berita" : kind === "distribution" ? "penyaluran bantuan" : kind === "activity" ? "kegiatan" : kind === "program" ? "program pemberdayaan" : "campaign";
  return <section className={styles.gallery} aria-label={`Galeri ${title}`}>
    <header className={styles.heading}><div className={styles.headingTitle}><h2>{kind === "campaign" ? "Dokumentasi campaign" : `Galeri ${category}`}</h2><span className={styles.count}>{photos.length} foto</span></div></header>
    <div className={styles.fullGrid}>{photos.map((photo, index) => <figure key={photo.id} className={styles.card}>
      <div className={styles.photo}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded admin media */}
        <img src={photo.image} alt={photo.caption || `Dokumentasi ${title}`} loading="lazy"/>
        {photo.isDemo && <span className={styles.demo}>Contoh dokumentasi</span>}
      </div><figcaption><span>{String(index + 1).padStart(2, "0")}</span><p>{photo.caption || `Dokumentasi ${category}`}{photo.isDemo && <small>Foto ilustrasi untuk pratinjau.</small>}</p></figcaption>
    </figure>)}</div>
  </section>;
}
