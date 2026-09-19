import { connection } from "next/server";
import { getAcademyAvailability } from "../api/access";
import { listPublicCourses } from "../api/courses";
import { CourseCard } from "./CourseCard";
import { EmptyState } from "./ui";

export async function HomeCourses() {
  await connection();
  let available: boolean;
  let courses: Awaited<ReturnType<typeof listPublicCourses>>;
  try {
    available = await getAcademyAvailability();
    courses = available ? await listPublicCourses("", 6) : [];
  } catch (error) {
    console.error("Academy home catalog unavailable", error instanceof Error ? error.name : "Unknown error");
    return <p role="status" className="rounded-2xl border border-lazsip-primary-200 bg-white p-8 text-center leading-7">Daftar program belum dapat dimuat. Silakan coba kembali beberapa saat lagi.</p>;
  }
  if (!courses.length) {
    return <EmptyState>{available ? "Program belajar segera hadir. Silakan kunjungi kembali untuk melihat materi terbaru." : "Program belajar sedang dipersiapkan. Silakan kunjungi kembali nanti."}</EmptyState>;
  }
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div>;
}
