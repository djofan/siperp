import Link from "next/link";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { listTeacherTasks } from "@/modules/ojol/api/tasks";
import { isTaskLocked } from "@/modules/ojol/api/policy";
import { Icon } from "@/modules/ojol/components/icons";
import { ButtonLink, Empty, PageTitle, Pill, TypePill, deadlineLabel, formatDateTime } from "@/modules/ojol/components/ui";

export const metadata = { title: "Tugas" };

export default async function GuruTasksPage() {
  const viewer = await requireOjolMember("guru");
  const tasks = await listTeacherTasks(viewer.member.id);

  return (
    <div>
      <PageTitle
        title="Tugas"
        description="Tugas yang Anda buat, dan tugas guru lain yang menunjuk Anda sebagai co-reviewer."
        action={
          <ButtonLink href="/ojol/guru/tugas/baru">
            <Icon name="plus" className="h-4 w-4" />
            Buat tugas
          </ButtonLink>
        }
      />
      {tasks.length ? (
        <div className="space-y-3">
          {tasks.map((task) => {
            const locked = isTaskLocked(task.deadline);
            const pending = task.submissions.length;
            return (
              <Link
                key={task.id}
                href={`/ojol/guru/tugas/${task.id}`}
                className="flex flex-col gap-3 rounded-2xl bg-ojol-surface p-4 ring-1 ring-ojol-line transition-colors hover:bg-ojol-paper sm:flex-row sm:items-center sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypePill type={task.type} />
                    {locked ? (
                      <Pill>
                        <Icon name="lock" className="h-3 w-3" />
                        Terkunci
                      </Pill>
                    ) : (
                      <Pill tone="primary">Aktif</Pill>
                    )}
                    {task.teacherId !== viewer.member.id && <Pill tone="gold">Co-review · {task.teacher?.user.name ?? "guru lain"}</Pill>}
                    {pending > 0 && <Pill tone="warning">{pending} menunggu koreksi</Pill>}
                  </div>
                  <p className="mt-2 truncate font-medium">{task.title}</p>
                  <p className="mt-0.5 text-xs text-ojol-muted" title={formatDateTime(task.deadline)}>
                    Tenggat {deadlineLabel(task.deadline)} · {task.groups.map((item) => item.group.name).join(", ") || "Belum ada kelompok"}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm sm:text-right">
                  <div>
                    <p className="text-lg font-semibold tabular-nums">{task._count.submissions}</p>
                    <p className="text-xs text-ojol-muted">terkumpul</p>
                  </div>
                  {task.type === "quiz" && (
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{task._count.questions}</p>
                      <p className="text-xs text-ojol-muted">soal</p>
                    </div>
                  )}
                  <Icon name="chevronRight" className="ml-auto h-4 w-4 text-ojol-muted sm:ml-0" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty title="Belum ada tugas.">Buat tugas pertama — voice note, video, atau kuis pilihan ganda.</Empty>
      )}
    </div>
  );
}
