import Link from "@/modules/academy/pwa/AcademyNavigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { ParticipantDiscussion } from "@/contracts/modules/academy";
import { requireAcademyProfile } from "../../../api/access";
import { PageHeading } from "../../../components/ui";
export default async function DiscussionPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAcademyProfile();
  const { id } = await params;
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const item = await academyPage<ParticipantDiscussion>(`academy/learning/discussions/${encodeURIComponent(id)}`);
  return <div className="mx-auto max-w-3xl p-4 md:p-6">
    <Link href={`/academy/tanya-jawab?page=${page}`} className="mb-5 inline-block text-sm text-green-700 underline">Kembali ke pertanyaan saya</Link>
    <PageHeading title="Detail tanya jawab">{item.course.cohort?.title ?? item.course.title}</PageHeading>
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Pertanyaan Anda</h2><p className="mt-2 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{item.question}</p></section>
    <section className="rounded-2xl border border-green-100 bg-green-50 p-5"><h2 className="font-semibold text-green-800">{item.answer ? "Jawaban pengajar" : "Menunggu jawaban"}</h2>
      {item.answeredAt && <p className="mt-2 text-xs text-gray-500">{new Date(item.answeredAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>}
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{item.answer || "Pengajar belum menjawab pertanyaan ini. Silakan periksa kembali nanti."}</p>
    </section>
  </div>;
}
