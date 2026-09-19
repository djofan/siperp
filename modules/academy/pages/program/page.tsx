import { requireAcademyAvailable } from "../../api/access";
import { listPublicCourses } from "../../api/courses";
import { CourseCard } from "../../components/CourseCard";
import { PageHeading, EmptyState, inputClass, linkButton } from "../../components/ui";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAcademyAvailable();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0, 100).trim() : "";
  const courses = await listPublicCourses(search);
  return <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><PageHeading eyebrow="Program belajar" title="Temukan langkah belajarmu.">Pilih program dan pelajari materinya sesuai urutan.</PageHeading>
    <form className="mb-8 flex items-end gap-3" action="/academy/program"><label className="flex-1 text-sm">Cari program<input name="q" maxLength={100} defaultValue={search} className={inputClass} placeholder="Nama program" /></label><button className={linkButton}>Cari</button></form>
    {courses.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <EmptyState>{search ? "Tidak ada program yang sesuai pencarian." : "Program belajar segera hadir."}</EmptyState>}
  </div>;
}
