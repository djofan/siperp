import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAcademyUser } from "../../api/access";
import { getLearningOverview } from "../../api/courses";
import { safeResourceUrl } from "../../api/policy";
import { PageHeading, LearnerNav, EmptyState, linkButton } from "../../components/ui";

export default async function CertificatesPage() {
  const user = await requireAcademyUser();
  const profileId = user.academyProfile?.id;
  const courses = profileId ? await getLearningOverview(profileId) : [];
  const records = profileId ? await prisma.zakatAcademyCompletionRecord.findMany({ where: { profileId }, select: { courseId: true, certificateUrl: true } }) : [];
  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading title="Sertifikat belajar">Selesaikan seluruh materi dan lulus seluruh kuis yang dipublikasikan dalam program.</PageHeading>
    {!courses.length ? <EmptyState>Anda belum mengikuti program belajar.</EmptyState> : <div className="space-y-5">{courses.map((course) => {
      const url = safeResourceUrl(records.find((record) => record.courseId === course.id)?.certificateUrl);
      return <article key={course.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6"><h2 className="text-xl font-bold">{course.title}</h2><p className="mt-3 text-sm">{course.completedLessons}/{course.totalLessons} materi selesai · {course.passedQuizzes}/{course.totalQuizzes} kuis lulus</p>
        {course.isEligible ? <div className="mt-5 flex flex-wrap gap-3"><Link href={`/academy/sertifikat/${course.id}`} className={linkButton}>Lihat sertifikat</Link>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-3 text-sm font-semibold underline">Unduh sertifikat dari pengelola ↗</a>}</div> : <p className="mt-4 text-sm text-lazsip-ink/60">Syarat kelulusan belum terpenuhi.</p>}
      </article>;
    })}</div>}
  </div>;
}
