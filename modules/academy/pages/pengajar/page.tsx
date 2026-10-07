import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "../../api/access";
import { PageHeading } from "../../components/ui";
import { AcademyIcon } from "../../components/icons";
import { ParticipantSupport } from "../../components/ParticipantSupport";
export default async function TeacherPage() {
  const user = await requireAcademyTeacher();
  const [materials, exams, questions, participants] = await Promise.all([
    prisma.zakatAcademyLesson.count(), prisma.zakatAcademyQuiz.count(),
    prisma.academyDiscussion.count({ where: { answer: null } }),
    prisma.zakatAcademyProfile.count({ where: { enrollments: { some: {} }, user: { isActive: true } } }),
  ]);
  const cards = [
    { href: "materi", title: "Materi teks & audio", value: materials, detail: "Tulis materi, tambahkan audio, dan atur publikasinya.", icon: "BookOpen" },
    { href: "ujian", title: "Soal & ujian", value: exams, detail: "Buat soal, tentukan kunci jawaban, dan jadwalkan ujian.", icon: "Quiz" },
    { href: "pertanyaan", title: "Pertanyaan belum dijawab", value: questions, detail: "Baca dan jawab pertanyaan peserta.", icon: "Users" },
    { href: "nilai", title: "Nilai peserta", value: participants, detail: "Lihat nilai semua peserta dan rincian hasil ujiannya.", icon: "Trophy" },
  ] as const;
  return <div className="mx-auto max-w-6xl p-4 md:p-8"><PageHeading eyebrow="Ruang pengajar" title={`Selamat datang, ${user.name}`}>Kelola pembelajaran Insan Academy dari empat menu berikut.</PageHeading><div className="grid gap-5 sm:grid-cols-2">{cards.map(card => <Link key={card.href} href={`/academy/pengajar/${card.href}`} className="rounded-2xl border border-gray-100 bg-white p-6 transition hover:border-green-300 hover:shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="rounded-xl bg-green-50 p-3 text-green-700"><AcademyIcon name={card.icon} className="h-6 w-6" /></span><span className="text-3xl font-bold">{card.value}</span></div><h2 className="font-semibold">{card.title}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{card.detail}</p><span className="mt-5 inline-block text-sm font-medium text-green-700">Buka →</span></Link>)}</div><div className="mt-8"><ParticipantSupport compact /></div></div>;
}
