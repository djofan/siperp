import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAcademyProfile } from "../../../api/access";
import { getLearningOverview } from "../../../api/courses";
import { PrintButton } from "../../../components/PrintButton";

export default async function CertificatePage({ params }: { params: Promise<{ courseId: string }> }) {
  const user = await requireAcademyProfile();
  const { courseId } = await params;
  const course = (await getLearningOverview(user.profileId)).find((item) => item.id === courseId);
  if (!course?.isEligible || !course.completedAt) notFound();
  return <div className="mx-auto max-w-5xl px-4 py-12 print:p-0"><div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden"><Link href="/academy/sertifikat" className="text-sm">← Daftar sertifikat</Link><PrintButton /></div>
    <article className="academy-certificate border-8 border-double border-lazsip-primary-700 bg-white px-6 py-16 text-center sm:px-16 print:break-inside-avoid">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-lazsip-primary-700">LAZSIP · Zakat Academy</p><h1 className="mt-8 font-serif text-4xl font-bold text-lazsip-primary-900 sm:text-5xl">Sertifikat Kelulusan</h1>
      <p className="mt-10 text-sm text-lazsip-ink/70">Diberikan kepada</p><p className="mt-4 text-3xl font-bold">{user.name}</p>{user.academyProfile?.nis && <p className="mt-2 font-mono text-sm">{user.academyProfile.nis}</p>}
      <p className="mt-8 leading-7">Atas penyelesaian seluruh materi dan kelulusan kuis pada program</p><p className="mt-3 text-2xl font-semibold text-lazsip-primary-800">{course.title}</p><p className="mt-8 text-sm">Diselesaikan pada {course.completedAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}</p>
      <p className="mt-12 text-sm font-semibold text-lazsip-primary-700">Platform Belajar Islami LAZSIP</p>
    </article>
  </div>;
}
