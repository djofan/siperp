import Link from "next/link";
import { requireAcademyParticipant } from "../../api/access";
import { listParticipantQuizzes } from "../../api/courses";
import { learnerCohorts } from "../../api/learner-cohorts";
import { PageHeading, EmptyState } from "../../components/ui";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
});
const timeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta",
});

function ExamSchedule({ label, date }: { label: string; date: Date | null }) {
  return <div>
    <dt className="text-xs font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm leading-6 text-gray-700">
      {date ? <time dateTime={date.toISOString()}>
        <span className="block">{dateFormat.format(date)}</span>
        <span className="font-medium">{timeFormat.format(date)} WIB</span>
      </time> : "Belum ditentukan"}
    </dd>
  </div>;
}

export default async function ExamsPage() {
  const user = await requireAcademyParticipant();
  const cohorts = user.academyProfile ? (await learnerCohorts()).filter(item => item.joined) : [];
  const cohort = cohorts.find(item => item.current)?.id ?? cohorts[0]?.id ?? "";
  const quizzes = user.academyProfile ? await listParticipantQuizzes(user.academyProfile.id, cohort) : [];
  const categories = [
    { kind: "DAILY", title: "Ujian harian" },
    { kind: "WEEKLY", title: "Ujian mingguan" },
    { kind: "FINAL", title: "Ujian akhir" },
  ] as const;
  const groups = categories.map(category => ({
    ...category,
    items: quizzes.filter(quiz => quiz.kind === category.kind).sort((a, b) => a.releaseDay - b.releaseDay),
  }));
  const numbers = new Map(groups.flatMap(group => group.items).map((quiz, index) => [quiz.id, index + 1]));

  return <div className="mx-auto max-w-5xl p-4 md:p-8">
    <PageHeading title="Ujian">Kerjakan ujian untuk menguji pemahamanmu.</PageHeading>
    {!quizzes.length && <EmptyState>Ujian belum dipublikasikan pengajar.</EmptyState>}
    {groups.filter(group => group.items.length > 0).map(group => <section key={group.kind} className="mb-8" aria-label={group.title}>
      <h2 className="mb-4 font-semibold">{group.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map(quiz => {
          const done = quiz.attempts.some(attempt => attempt.isCompleted);
          return <article key={quiz.id} className="academy-quiz-card flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Ujian {numbers.get(quiz.id)}</p>
            <h3 className="mt-2 break-words text-base font-semibold leading-6">{quiz.title}</h3>
            <p className="mt-2 text-sm text-gray-500">{quiz._count.questions} soal <span aria-hidden="true">·</span> {quiz.timeLimitMinutes} menit</p>
            <dl className="my-4 grid gap-3 border-t border-gray-100 pt-4">
              <ExamSchedule label="Mulai" date={quiz.quizDate} />
              <ExamSchedule label="Selesai" date={quiz.closesAt} />
            </dl>
            <Link href={`/academy/kuis/${quiz.id}`} className="mt-auto flex min-h-11 items-center justify-center rounded-xl bg-green-50 px-3 py-2.5 text-center text-sm font-semibold text-green-700 hover:bg-green-100">
              {done ? "Lihat hasil & ujian" : "Lihat ujian"} →
            </Link>
          </article>;
        })}
      </div>
    </section>)}
  </div>;
}
