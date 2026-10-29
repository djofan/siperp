import Link from "next/link";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage6 } from "@/modules/academy/api/page-contracts";
import { requireAcademyParticipant } from "../../api/access";
import { getLearningOverview } from "../../api/courses";
import { safeResourceUrl } from "../../api/policy";
import { PageHeading, LearnerNav, EmptyState, linkButton } from "../../components/ui";
export default async function CertificatesPage() {
    const user = await requireAcademyParticipant();
    const profileId = user.academyProfile?.id;
    const courses = profileId ? await getLearningOverview(profileId) : [];
    const records = profileId ? await academyPage<AcademyPage6["records"]>("academy/learning/certificates") : [];
    return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading title="Sertifikat">Selesaikan seluruh materi, lulus semua evaluasi harian, pekanan, dan akhir, serta capai nilai berbobot minimal 70.</PageHeading>
    {!courses.length ? <EmptyState>Anda belum mengikuti program belajar.</EmptyState> : <div className="space-y-5">{courses.map((course) => {
                const url = safeResourceUrl(records.find((record) => record.courseId === course.id)?.certificateUrl);
                return <article key={course.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6"><div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4"><h2 className="text-base font-semibold">{course.title}</h2><span className={`rounded-full px-3 py-1 text-xs ${course.isEligible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{course.isEligible ? "Selesai" : "Belum Selesai"}</span></div><div className="mt-4 space-y-2 text-sm"><p><span className={course.totalLessons > 0 && course.completedLessons === course.totalLessons ? "text-green-600" : "text-gray-400"}>◎</span> Lesson: {course.completedLessons}/{course.totalLessons} selesai</p><p><span className={course.totalQuizzes > 0 && course.passedQuizzes === course.totalQuizzes ? "text-green-600" : "text-gray-400"}>◎</span> Ujian: {course.passedQuizzes}/{course.totalQuizzes} lulus</p></div>
        {course.isEligible ? <div className="mt-5 flex flex-wrap gap-3"><Link href={`/academy/sertifikat/${course.id}`} className={linkButton}>Lihat sertifikat</Link>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-3 text-sm font-semibold underline">Unduh sertifikat dari pengelola ↗</a>}</div> : <p className="mt-4 text-sm text-lazsip-ink/60">Syarat kelulusan belum terpenuhi.</p>}
      </article>;
            })}</div>}
  </div>;
}
