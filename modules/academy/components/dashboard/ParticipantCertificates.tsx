import Link from "@/modules/academy/pwa/AcademyNavigation";
import { academyPage } from "../../api/page-data";
import type { AcademyPage6 } from "../../api/page-contracts";
import { getLearningOverview } from "../../api/courses";
import { safeResourceUrl } from "../../api/policy";
import { EmptyState, linkButton } from "../ui";

export async function ParticipantCertificates({ profileId }: { profileId: string }) {
  const [overview, records] = await Promise.all([
    getLearningOverview(profileId),
    academyPage<AcademyPage6["records"]>("academy/learning/certificates"),
  ]);
  const courses = overview.filter(course => course.certificateVisible);
  return <section id="sertifikat" aria-labelledby="academy-certificates-heading" className="mt-8 scroll-mt-6">
    <h1 id="academy-certificates-heading" className="text-2xl font-semibold">Sertifikat</h1>
    <p className="mb-5 mt-2 text-sm leading-6 text-gray-500">Sertifikat tersedia setelah seluruh periode ujian berakhir, termasuk bagi peserta yang tidak mengerjakan seluruh ujian. Tidak ada nilai minimum.</p>
    {!courses.length ? <EmptyState>Belum ada data sertifikat.</EmptyState> : <div className="space-y-4">{courses.map(course => {
      const url = safeResourceUrl(records.find(record => record.courseId === course.id)?.certificateUrl);
      return <article key={course.id} className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <h3 className="font-semibold">{course.title}</h3>
          <span className={`rounded-full px-3 py-1 text-xs ${course.isEligible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{course.isEligible ? "Selesai" : "Belum selesai"}</span>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>Ujian: {course.completedQuizzes}/{course.totalQuizzes}</p>
        </div>
        {course.isEligible ? <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={`/academy/sertifikat/${course.id}`} className={linkButton}>Lihat sertifikat</Link>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">Unduh sertifikat dari pengelola ↗</a>}
        </div> : null}
      </article>;
    })}</div>}
  </section>;
}
