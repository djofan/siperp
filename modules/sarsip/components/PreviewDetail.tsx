import { SarsipGallery } from "./SarsipGallery";
import { previewGallery } from "./landingPreview";
import Image from "next/image";
import Link from "next/link";
import { money } from "@/modules/sarsip/api/data";
import { previewEntries, previewBeneficiaries } from "./landingPreview";
import { notFound } from "next/navigation";
import styles from "./Detail.module.css";
import { DetailLayout, CampaignSummary } from "./DetailLayout";
import { DonationForm } from "./DonationForm";
import { EntryCard } from "./EntryCard";

export function PreviewDetail({ kind, id }: { kind: string; id: string }) {
  const beneficiary = kind === "penerima-manfaat" ? previewBeneficiaries.find(row => row.id === id) : undefined;
  const entry = beneficiary ? { title: beneficiary.publicName, description: `Contoh dokumentasi penyaluran bantuan kategori ${beneficiary.category}. Bantuan diarahkan untuk mendukung kebutuhan dasar keluarga sesuai hasil pendataan.`, image: beneficiary.image, location: "", currentAmount: beneficiary.amount, targetAmount: 0 } : previewEntries(kind).find(row => row.id === id);
  if (!entry) notFound();
  const related = kind === "penerima-manfaat" ? [] : previewEntries(kind).filter(row => row.id !== id).slice(0, 3);
  return <DetailLayout title={entry.title} kind={kind} preview
    gallery={<SarsipGallery photos={previewGallery(entry.title)} title={entry.title} kind={kind === "campaign" ? "campaign" : kind === "berita" ? "news" : kind === "penerima-manfaat" ? "distribution" : "activity"}/>}
    sidebar={kind === "campaign" ? <DonationForm campaignId={id} methods={[]} preview/> : <div className={styles.infoBox}><h2>{beneficiary ? "Ringkasan bantuan contoh" : "Informasi kegiatan"}</h2>{beneficiary && <p><strong>{money(entry.currentAmount)}</strong> · Nominal bantuan ilustrasi</p>}<p>Halaman ini merupakan contoh desain. Konten dan foto hanya ilustrasi.</p>{related.map(row => <Link key={row.id} href={`/sarsip/${kind}/${row.id}`}>{row.title} →</Link>)}</div>}
    related={related.length ? <div className={styles.relatedGrid}>{related.map(row => <EntryCard key={row.id} entry={row}/>)}</div> : undefined}>
      {entry.location && <div className={styles.meta}>{entry.location}</div>}
      <Image src={entry.image} alt="Foto ilustrasi kegiatan kemanusiaan" width={1000} height={650} unoptimized sizes="(min-width: 900px) 60vw, 100vw"/>
      {kind === "campaign" && <CampaignSummary current={entry.currentAmount} target={entry.targetAmount} preview/>}
      <p>{entry.description}</p>
      <h2>{kind === "berita" ? "Kepedulian dimulai dari memahami kebutuhan" : "Dukungan yang sesuai kebutuhan di lapangan"}</h2>
      <p>Dalam contoh ini, tim berkoordinasi dengan warga dan relawan setempat untuk mendata kebutuhan, menyiapkan perlengkapan, serta menyusun rencana kegiatan. Pendataan membantu menentukan prioritas bantuan dan lokasi yang perlu dijangkau.</p>
      <h2>{kind === "berita" ? "Kolaborasi dan pencatatan" : "Pelaksanaan dan dokumentasi"}</h2>
      <p>Perlengkapan diperiksa sebelum kegiatan. Bantuan disiapkan berdasarkan kebutuhan keluarga, kemudian penyerahannya dicatat dan didokumentasikan. Evaluasi kegiatan menjadi bahan perbaikan untuk dukungan selanjutnya.</p>
  </DetailLayout>;
}
