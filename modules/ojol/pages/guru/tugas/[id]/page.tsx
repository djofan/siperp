import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { getTeacherTask } from "@/modules/ojol/api/tasks";
import { listTaskResults } from "@/modules/ojol/api/submissions";
import { isTaskLocked } from "@/modules/ojol/api/policy";
import { deleteTaskAction, extendTaskAction } from "@/modules/ojol/api/actions/guru";
import { ConfirmDelete } from "@/modules/ojol/components/app/ConfirmDelete";
import { ExtendDeadlineForm } from "@/modules/ojol/components/app/ExtendDeadlineForm";
import { Icon } from "@/modules/ojol/components/icons";
import {
  ButtonLink,
  Card,
  Empty,
  LatePill,
  Pill,
  ScoreBadge,
  SectionTitle,
  Stat,
  SubmissionPill,
  TypePill,
  deadlineLabel,
  formatDateTime,
} from "@/modules/ojol/components/ui";

export default async function GuruTaskResultPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireOjolMember("guru");
  const { id } = await params;
  const task = await getTeacherTask(id, viewer.member.id);
  if (!task) notFound();
  const results = await listTaskResults(task.id);
  const locked = isTaskLocked(task.deadline);
  const audience = task.groups.reduce((total, item) => total + item.group._count.members, 0);
  const isQuiz = task.type === "quiz";
  const average = isQuiz && results.length ? Math.round(results.reduce((sum, row) => sum + (row.score ?? 0), 0) / results.length) : null;
  const count = (status: string) => results.filter((row) => row.status === status).length;

  return (
    <div className="space-y-6">
      <Link href="/ojol/guru/tugas" className="inline-flex items-center gap-1.5 text-sm text-ojol-muted hover:text-ojol-ink">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Semua tugas
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypePill type={task.type} />
            {locked ? <Pill>Terkunci</Pill> : <Pill tone="primary">Aktif</Pill>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{task.title}</h1>
          <p className="mt-1.5 text-sm text-ojol-muted">
            Tenggat {formatDateTime(task.deadline)} ({deadlineLabel(task.deadline)})
            {task.originalDeadline.getTime() !== task.deadline.getTime() && ` · tenggat awal ${formatDateTime(task.originalDeadline)}`}
          </p>
        </div>
        {task.canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/ojol/guru/tugas/${task.id}/ubah`} variant="secondary">
              <Icon name="edit" className="h-4 w-4" />
              Ubah
            </ButtonLink>
            <ConfirmDelete action={deleteTaskAction.bind(null, task.id)} label="Hapus tugas" confirmText="Hapus tugas & semua setorannya?" redirectTo="/ojol/guru/tugas" />
          </div>
        )}
      </header>

      <p className="-mt-3 text-sm text-ojol-muted">
        {task.canManage ? "Dibuat oleh Anda" : `Dibuat oleh ${task.teacher?.user.name ?? "guru lain"} · Anda co-reviewer`}
        {task.approvers.length > 0 && ` · Co-reviewer: ${task.approvers.map((item) => item.teacher.user.name).join(", ")}`}
        {` · Kelompok: ${task.groups.map((item) => item.group.name).join(", ") || "—"}`}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Terkumpul" value={`${results.length}/${audience}`} />
        {isQuiz ? (
          <>
            <Stat label="Rata-rata nilai" value={average ?? "—"} />
            <Stat label="Terlambat" value={results.filter((row) => row.isLate).length} />
            <Stat label="Soal" value={task.questions.length} />
          </>
        ) : (
          <>
            <Stat label="Menunggu" value={count("pending")} emphasis={count("pending") > 0} />
            <Stat label="Disetujui" value={count("approved")} />
            <Stat label="Ditolak" value={count("rejected")} />
          </>
        )}
      </div>

      {locked && task.canManage && (
        <Card>
          <SectionTitle>Perpanjang tenggat</SectionTitle>
          <ExtendDeadlineForm action={extendTaskAction.bind(null, task.id)} />
        </Card>
      )}

      <Card>
        <SectionTitle>Perintah</SectionTitle>
        <p className="whitespace-pre-line leading-relaxed text-ojol-muted">{task.description}</p>
      </Card>

      <section>
        <SectionTitle>{isQuiz ? "Hasil kuis" : "Hasil setoran"}</SectionTitle>
        {results.length ? (
          <div className="overflow-hidden rounded-2xl bg-ojol-surface ring-1 ring-ojol-line">
            <table className="w-full text-sm">
              <thead className="bg-ojol-paper text-left text-xs text-ojol-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Peserta</th>
                  <th className="px-4 py-3 font-medium">{isQuiz ? "Nilai" : "Status"}</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">{isQuiz ? "Benar" : "Percobaan"}</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Ketepatan</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Dikirim</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id} className="border-t border-ojol-line/70">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.student.user.name}</p>
                      <p className="text-xs text-ojol-muted">{row.student.code}</p>
                    </td>
                    <td className="px-4 py-3">{isQuiz ? <ScoreBadge score={row.score ?? 0} /> : <SubmissionPill status={row.status} />}</td>
                    <td className="hidden px-4 py-3 tabular-nums sm:table-cell">
                      {isQuiz ? `${row._count.answers}/${row.answers.length}` : `ke-${row.attemptsCount}`}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <LatePill late={row.isLate} />
                    </td>
                    <td className="hidden px-4 py-3 text-ojol-muted md:table-cell">{formatDateTime(row.submittedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/ojol/guru/koreksi/${row.id}`} className="text-sm font-medium text-ojol-primary hover:underline">
                        {row.status === "pending" ? "Koreksi" : "Lihat"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Belum ada yang mengumpulkan." />
        )}
      </section>
    </div>
  );
}
