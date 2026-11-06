import Link from "next/link";
import { requireAcademyParticipant } from "../../api/access";
import { learnerCohorts } from "../../api/learner-cohorts";
import { joinCohort } from "../../api/cohort-actions";
import { ActionForm } from "../../components/ActionForm";
import { PageHeading, EmptyState } from "../../components/ui";
export default async function CohortsPage() {
  await requireAcademyParticipant(); const cohorts = await learnerCohorts();
  return <div className="academy-page"><PageHeading title="Angkatan Saya">Ikuti angkatan berikutnya setelah menyelesaikan seluruh ujian hingga ujian akhir. Riwayat angkatan sebelumnya tetap tersimpan.</PageHeading><div className="space-y-4">{cohorts.map(cohort => <article key={cohort.id} className="academy-card p-5"><h2 className="font-semibold">{cohort.title}</h2><p className="my-3 text-sm text-gray-500">{cohort.joined ? cohort.finished ? "Ujian selesai" : "Sedang diikuti" : "Pendaftaran dibuka"}</p>{cohort.joined ? <Link href={`/academy/materi?cohort=${cohort.id}`} className="text-sm text-green-700">Lihat materi dan riwayat →</Link> : <ActionForm action={joinCohort.bind(null, cohort.id)} label="Daftar angkatan" />}</article>)}</div>{!cohorts.length && <EmptyState>Belum ada angkatan yang membuka pendaftaran.</EmptyState>}</div>;
}
