import { listPublicBeneficiaries } from "@/modules/sarsip/api/beneficiaries";
import { SarsipGallery } from "@/modules/sarsip/components/SarsipGallery";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry, isEntryKind, listPaymentMethods, money } from "@/modules/sarsip/api/data";
import { DonationForm } from "@/modules/sarsip/components/DonationForm";
import { RelatedEntries } from "@/modules/sarsip/components/RelatedEntries";
import { PreviewDetail } from "@/modules/sarsip/components/PreviewDetail";
import { DetailLayout, CampaignSummary } from "@/modules/sarsip/components/DetailLayout";
import styles from "@/modules/sarsip/components/Detail.module.css";
export default async function DetailPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (id.startsWith("preview-")) {
    if (process.env.NODE_ENV !== "development" || !["campaign", "kegiatan", "berita", "penerima-manfaat"].includes(kind)) notFound();
    return <PreviewDetail kind={kind} id={id}/>;
  }
  if (kind === "penerima-manfaat") {
    const row = (await listPublicBeneficiaries()).find(item => item.id === id);
    if (!row) notFound();
    return <DetailLayout title={row.publicName || "Penerima manfaat SARSIP"} kind={kind} gallery={<SarsipGallery photos={row.gallery ?? []} title={row.publicName || "Penyaluran bantuan"} kind="distribution"/>} sidebar={<div className={styles.infoBox}><h2>Ringkasan bantuan</h2><p>{row.category}</p><p>{money(row.amount)} tersalurkan</p></div>}>
      {row.image && <Image src={row.image} alt="Dokumentasi bantuan" width={1000} height={650} unoptimized/>}
      <p>Dokumentasi bantuan {row.category.toLowerCase()} yang dipublikasikan dengan persetujuan penerima manfaat.</p>
    </DetailLayout>;
  }
  if (!isEntryKind(kind)) notFound();
  const entry = await getEntry(id, kind);
  if (!entry) notFound();
  const isCampaign = kind === "campaign";
  const methods = isCampaign ? await listPaymentMethods() : [];
  const related = <RelatedEntries currentId={id} kind={kind}/>;
  return <DetailLayout title={entry.title} kind={kind}
    gallery={<SarsipGallery photos={entry.gallery ?? []} title={entry.title} kind={isCampaign ? "campaign" : kind === "berita" ? "news" : "activity"}/>}
    sidebar={isCampaign ? entry.status === "published" ? <DonationForm campaignId={id} methods={methods}/> : <div className={styles.infoBox}><h2>Campaign selesai</h2><p>Terima kasih atas dukungan Anda. Donasi untuk campaign ini sudah ditutup.</p><Link href="/sarsip#campaign">Lihat campaign lainnya →</Link></div> : related}
    related={isCampaign || kind === "berita" ? related : undefined}>
    <div className={styles.meta}>{entry.location && <span>{entry.location}</span>}{entry.eventDate && <time dateTime={entry.eventDate.toISOString()}>{entry.eventDate.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })}</time>}</div>
    {entry.image && <Image src={entry.image} alt={entry.title} width={1000} height={650} unoptimized sizes="(max-width: 900px) 100vw, 60vw"/>}
    {isCampaign && <CampaignSummary current={entry.currentAmount} target={entry.targetAmount}/>}
    <p>{entry.description}</p>

  </DetailLayout>;
}
