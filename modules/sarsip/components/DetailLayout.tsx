import Link from "next/link";
import { money } from "@/modules/sarsip/api/data";
import styles from "./Detail.module.css";
export function DetailLayout({ title, kind, preview = false, children, sidebar, related, gallery }: { title: string; kind: string; preview?: boolean; children: React.ReactNode; sidebar: React.ReactNode; related?: React.ReactNode; gallery?: React.ReactNode }) {
  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Navigasi detail"><Link href="/sarsip">← Beranda</Link><span aria-hidden="true">/</span><Link href={preview || kind === "campaign" ? `/sarsip#${kind}` : `/sarsip/${kind}`}>Semua {kind}</Link></nav>
    {preview && <p className={styles.notice}>Pratinjau desain · Cerita, foto, dan nominal merupakan contoh. Pembayaran tidak diaktifkan.</p>}
    <header className={styles.heading}><p>SARSIP / {kind}</p><h1>{title}</h1></header>
    <div className={`${styles.columns} ${kind === "campaign" ? styles.campaign : ""}`}>
      {kind === "campaign" && <aside className={styles.sidebar} aria-label="Form donasi SARSIP">{sidebar}</aside>}
      <article className={styles.article}>{children}</article>
      {kind !== "campaign" && <aside className={styles.sidebar} aria-label="Informasi terkait">{sidebar}</aside>}
    </div>
    {gallery}
    {related && <section className={styles.related}><h2>{kind === "campaign" ? "Campaign lainnya" : "Jelajahi kabar dan kegiatan tim"}</h2>{related}</section>}
  </div>;
}
export function CampaignSummary({ current, target, preview = false }: { current: number; target: number; preview?: boolean }) {
  const progress = target > 0 ? Math.min(100, Math.max(0, current / target * 100)) : 0;
  return <div className={styles.summary}>
    {target > 0 && <div role="progressbar" aria-label="Pencapaian target donasi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className={styles.progress}><div style={{ width: `${progress}%` }}/></div>}
    <div><strong>{money(current)}</strong><span>{target > 0 ? `dari ${money(target)}` : "Terkumpul · Tanpa target nominal"}</span></div>
    <p>{preview ? "Nominal ilustrasi untuk pratinjau desain." : "Total donasi terkonfirmasi, tanpa biaya admin."}</p>
  </div>;
}
