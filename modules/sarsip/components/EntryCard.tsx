import Link from "next/link";
import Image from "next/image";
import { MapPin, LifeBuoy } from "lucide-react";
import { money } from "@/modules/sarsip/api/data";
import styles from "./Landing.module.css";
type Entry = { id: string; kind: string; title: string; description: string; image: string | null; location: string | null; targetAmount: number; currentAmount: number; status: string; isPreview?: boolean };
export function EntryCard({ entry }: { entry: Entry }) {
  const progress = Math.min(100, Math.max(0, entry.targetAmount ? entry.currentAmount / entry.targetAmount * 100 : 0));
  const content = <>
    <div className={styles.cardVisual}>
      {entry.image ? <Image unoptimized fill sizes="(max-width: 540px) 100vw, (max-width: 1024px) 50vw, 25vw" src={entry.image} alt={entry.isPreview ? "Foto ilustrasi kegiatan kemanusiaan" : entry.title}/> : <div className={styles.cardPlaceholder} aria-hidden="true"><LifeBuoy size={32}/> SARSIP</div>}
      {entry.isPreview && <span className={styles.previewBadge}>Contoh desain</span>}
      <span className={styles.cardBadge}>{entry.kind === "campaign" ? "Galang dukungan" : entry.kind === "kegiatan" ? "Kegiatan tim" : "Berita"}</span>
    </div>
    <div className={styles.cardBody}>
      <h3>{entry.title}</h3><p className={styles.cardDescription}>{entry.description}</p>
      {entry.location && <p className={styles.cardLocation}><MapPin size={14} aria-hidden="true"/><span>{entry.location}</span></p>}
      {entry.kind === "campaign" ? <div className={styles.campaignSummary}>
        <div className={styles.progress}><div style={{ width: `${progress}%` }}/></div>
        <div className={styles.campaignAmounts}><strong>{money(entry.currentAmount)}</strong><span>{Math.round(progress)}%</span></div>
        <p>Target {money(entry.targetAmount)} · {entry.status === "completed" ? "Selesai" : "Terbuka"}</p>
      </div> : <p className={styles.readMore}>Baca selengkapnya <span aria-hidden="true">→</span></p>}
    </div>
  </>;
  if (entry.kind === "campaign") return <article className={styles.card}>
    <Link href={`/sarsip/campaign/${entry.id}`} className={styles.cardMain} aria-label={entry.isPreview ? `Contoh desain: ${entry.title}` : entry.title}>{content}</Link>
    <Link href={`/sarsip/campaign/${entry.id}${entry.status === "completed" ? "" : "#donasi"}`} className={styles.cardDonate} aria-label={`${entry.status === "completed" ? "Lihat campaign" : "Donasi untuk"}: ${entry.title}`}>{entry.status === "completed" ? "Lihat campaign" : "Donasi sekarang"}<span aria-hidden="true">→</span></Link>
  </article>;
  return <Link href={`/sarsip/${entry.kind}/${entry.id}`} className={styles.card} aria-label={entry.isPreview ? `Contoh desain: ${entry.title}` : undefined}>{content}</Link>;
}
