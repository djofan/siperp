import Link from "next/link";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { teacherSummary } from "@/modules/ojol/api/dashboard";
import { listReviewQueue } from "@/modules/ojol/api/submissions";
import { Icon } from "@/modules/ojol/components/icons";
import { ButtonLink, Empty, Pill, SectionTitle, Stat, TypePill, deadlineLabel, formatDateTime } from "@/modules/ojol/components/ui";

export default async function GuruHomePage() {
  const viewer = await requireOjolMember("guru");
  const [summary, queue] = await Promise.all([teacherSummary(viewer.member.id), listReviewQueue(viewer.member.id)]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ojol-muted">Assalamu&apos;alaikum,</p>
          <h1 className="mt-1 font-[family-name:var(--font-ojol-display)] text-3xl font-bold tracking-tight sm:text-4xl">{viewer.name}</h1>
        </div>
        <ButtonLink href="/ojol/guru/tugas/baru">
          <Icon name="plus" className="h-4 w-4" />
          Buat tugas
        </ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Menunggu koreksi" value={summary.pending} emphasis={summary.pending > 0} hint={summary.pending ? "Segera periksa" : "Semua sudah dikoreksi"} />
        <Stat label="Tugas dibuat" value={summary.tasks} />
        <Stat label="Koreksi selesai" value={summary.reviewed} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <SectionTitle
            action={
              queue.length > 0 && (
                <Link href="/ojol/guru/koreksi" className="text-sm font-medium text-ojol-primary hover:underline">
                  Lihat semua
                </Link>
              )
            }
          >
            Antrean koreksi
          </SectionTitle>
          {queue.length ? (
            <div className="space-y-2">
              {queue.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/ojol/guru/koreksi/${item.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-ojol-surface p-4 ring-1 ring-ojol-line hover:ring-ojol-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.student.user.name}</p>
                    <p className="truncate text-sm text-ojol-muted">{item.task.title}</p>
                  </div>
                  <div className="hidden flex-col items-end gap-1 text-xs text-ojol-muted sm:flex">
                    <TypePill type={item.task.type} />
                    <span>{formatDateTime(item.submittedAt)}</span>
                  </div>
                  <Icon name="chevronRight" className="h-4 w-4 text-ojol-muted" />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Tidak ada setoran yang menunggu.">Setoran baru dari peserta akan muncul di sini.</Empty>
          )}
        </section>

        <section>
          <SectionTitle>Tugas berjalan</SectionTitle>
          {summary.activeTasks.length ? (
            <div className="space-y-2">
              {summary.activeTasks.map((task) => {
                const audience = task.groups.reduce((total, item) => total + item.group._count.members, 0);
                return (
                  <Link
                    key={task.id}
                    href={`/ojol/guru/tugas/${task.id}`}
                    className="block rounded-2xl bg-ojol-surface p-4 ring-1 ring-ojol-line hover:ring-ojol-primary/40"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TypePill type={task.type} />
                      {task.teacherId !== viewer.member.id && <Pill tone="gold">Co-reviewer</Pill>}
                    </div>
                    <p className="mt-2 truncate font-medium">{task.title}</p>
                    <p className="mt-0.5 text-xs text-ojol-muted">
                      {task._count.submissions}/{audience} terkumpul · tenggat {deadlineLabel(task.deadline)}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty title="Belum ada tugas berjalan." />
          )}
        </section>
      </div>
    </div>
  );
}
