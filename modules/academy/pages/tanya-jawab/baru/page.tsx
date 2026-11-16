import Link from "@/modules/academy/pwa/AcademyNavigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage5 } from "@/modules/academy/api/page-contracts";
import { requireAcademyProfile } from "../../../api/access";
import { askParticipantQuestion } from "../../../api/discussion-actions";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, inputClass } from "../../../components/ui";
export default async function AskPage() {
  await requireAcademyProfile();
  const { enrollments } = await academyPage<Pick<AcademyPage5, "enrollments">>("academy/learning/discussions?view=table");
  return <div className="mx-auto max-w-3xl p-4 md:p-6">
    <Link href="/academy/tanya-jawab" className="mb-5 inline-block text-sm text-green-700 underline">Kembali ke pertanyaan saya</Link>
    <PageHeading title="Ajukan pertanyaan">Pilih angkatan / program dan tuliskan pertanyaan. Setelah terkirim, Anda kembali ke tabel.</PageHeading>
    {!enrollments.length ? <p className="rounded-xl bg-amber-50 p-4 text-sm">Ikuti angkatan / program terlebih dahulu untuk bertanya.</p> : <section className="rounded-2xl border border-gray-200 bg-white p-5"><ActionForm action={askParticipantQuestion} label="Kirim pertanyaan & kembali">
      <label className="block text-sm">Angkatan / Program<select name="courseId" required className={inputClass} defaultValue=""><option value="" disabled>Pilih angkatan / program</option>{enrollments.map(({ course }) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      <label className="block text-sm">Pertanyaan<textarea name="question" minLength={10} maxLength={3000} required rows={8} className={inputClass}/></label>
      <p className="text-xs text-gray-500">Minimal 10, maksimal 3.000 karakter. Pertanyaan hanya terlihat oleh Anda dan pengelola.</p>
    </ActionForm></section>}
  </div>;
}
