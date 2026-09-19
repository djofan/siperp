import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminCompletion } from "@/modules/academy/api/admin-participants";
import { saveAcademyCertificate, deleteAcademyCompletion } from "@/modules/academy/api/actions";
import { safeResourceUrl } from "@/modules/academy/api/policy";
import { AdminHeading, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { ProgressSummary, adminDate } from "@/modules/academy/components/admin/ParticipantUi";
import { CertificateForm } from "@/modules/academy/components/admin/ParticipantForms";
import { DeleteForm } from "@/modules/academy/components/admin/ContentControls";
export default async function Page({ params, searchParams }: {
  params: Promise<{ recordId: string }>; searchParams: Promise<{ tersimpan?: string }>;
}) {
  await requireAcademyAdmin();
  const { recordId } = await params;
  const data = await getAdminCompletion(recordId);
  if (!data) notFound();
  const url = safeResourceUrl(data.certificateUrl);
  return <><AdminHeading title={"Sertifikat: " + data.profile.user.name} description={data.course.title + " · " + data.profile.user.email} backHref="/admin/academy/sertifikat" />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <section className="space-y-4 rounded-2xl bg-surface p-6">
      <h2 className="text-lg font-bold text-foreground">Kelulusan saat ini</h2>
      {data.current ? <><ProgressSummary value={data.current} /><p className="text-sm text-foreground">Tanggal selesai saat ini: {adminDate(data.current.completedAt)}</p>
        <Link className="inline-block text-sm text-accent hover:underline" href={"/admin/academy/peserta/" + data.current.id}>Lihat progres peserta</Link></>
        : <p className="text-sm text-danger">Enrollment tidak ditemukan. Tautan baru tidak dapat diberikan.</p>}
      <p className="text-sm text-foreground/60">Catatan tersimpan: {data.isEligible ? "lulus" : "belum lulus"} · Tanggal selesai {adminDate(data.completedAt)} · Diperbarui {adminDate(data.updatedAt)}</p>
      {!data.profile.user.isActive && <p className="text-sm text-danger">Akun peserta nonaktif; pemberian tautan sertifikat diblokir.</p>}
      <CertificateForm action={saveAcademyCertificate.bind(null, recordId)} initial={data.certificateUrl} />
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-accent underline">Buka file sertifikat tersimpan ↗</a>}
      <p className="text-sm leading-6 text-foreground/60">Catatan kelulusan mengikuti progres terbaru. Menghapus tautan atau catatan tidak mencabut sertifikat otomatis bagi peserta yang masih memenuhi syarat.</p>
    </section>
    <DeleteForm title="catatan kelulusan ini" description="Catatan dan tautan tambahan dihapus. Progres serta riwayat kuis tetap tersimpan. Peserta yang lulus tetap dapat mencetak sertifikat otomatis." action={deleteAcademyCompletion.bind(null, recordId)} />
  </>;
}

