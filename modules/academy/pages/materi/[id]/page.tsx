import { listReturn } from "../../../list-navigation";
import Link from "next/link";
import { getMaterial } from "../../../api/materials";
import { getAcademyUser, requireAcademyAvailable } from "../../../api/access";
import { getEnrollment } from "../../../api/courses";
import { startMaterial } from "../../../api/material-actions";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, linkButton } from "../../../components/ui";
import LessonPage from "../../program/[slug]/[lessonSlug]/page";
export default async function MaterialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  await requireAcademyAvailable(); const { id } = await params;
  const [material, user] = await Promise.all([getMaterial(id), getAcademyUser()]);
  const back = listReturn("/academy/materi", (await searchParams).back);
  const enrollment = await getEnrollment(user?.academyProfile?.id, material.chapter.courseId);
  if (enrollment) return LessonPage({ params: Promise.resolve({ slug: material.chapter.course.slug, lessonSlug: material.slug }), back });
  return <div className="academy-page"><Link href={back} className="mb-5 inline-block text-sm text-green-700">← Daftar materi</Link><PageHeading title={material.title}>{material.shortDescription}</PageHeading>{user ? <ActionForm action={startMaterial.bind(null, id)} label="Mulai belajar" /> : <Link href="/academy/masuk" className={linkButton}>Masuk untuk belajar</Link>}</div>;
}
