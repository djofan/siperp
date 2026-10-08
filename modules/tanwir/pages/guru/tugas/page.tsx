import Link from "next/link";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { listTeacherTasks } from "@/modules/tanwir/api/tasks";
import { isTaskLocked } from "@/modules/tanwir/api/policy";
import { Icon } from "@/modules/tanwir/components/icons";
import { ButtonLink, Empty, PageTitle, Pill, TypePill, deadlineLabel, formatDateTime } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Tugas" };

export default async function GuruTasksPage() {
  const viewer = await requireTanwirMember("guru");
  const tasks = await listTeacherTasks(viewer.member.id);

  return (
    <div>
      <PageTitle
        title="Tugas"
        description="Tugas yang Anda buat. Setiap tugas otomatis terkirim ke semua kelompok yang Anda PIC-i."
        action={
          <ButtonLink href="/tanwir/guru/tugas/baru">
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
                href={`/tanwir/guru/tugas/${task.id}`}
                className="flex flex-col gap-3 rounded-2xl bg-tanwir-surface p-4 ring-1 ring-tanwir-line transition-colors hover:ring-tanwir-primary/40 sm:flex-row sm:items-center sm:p-5"
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
                    {pending > 0 && <Pill tone="warning">{pending} menunggu koreksi</Pill>}
                  </div>
                  <p className="mt-2 truncate font-medium">{task.title}</p>
                  <p className="mt-0.5 text-xs text-tanwir-muted" title={formatDateTime(task.deadline)}>
                    Tenggat {deadlineLabel(task.deadline)} · {task.groups.map((item) => item.group.name).join(", ") || "Belum ada kelompok"}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm sm:text-right">
                  <div>
                    <p className="text-lg font-semibold tabular-nums">{task._count.submissions}</p>
                    <p className="text-xs text-tanwir-muted">terkumpul</p>
                  </div>
                  {task.type === "quiz" && (
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{task._count.questions}</p>
                      <p className="text-xs text-tanwir-muted">soal</p>
                    </div>
                  )}
                  <Icon name="chevronRight" className="ml-auto h-4 w-4 text-tanwir-muted sm:ml-0" />
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
