import Link from "next/link";
import type { StudentTaskState, TaskType } from "@/modules/ojol/api/policy";
import { Icon } from "@/modules/ojol/components/icons";
import { LatePill, ScoreBadge, TaskStatePill, TypePill, deadlineLabel, formatDateTime } from "@/modules/ojol/components/ui";

const TYPE_ICON = { voice_note: "mic", video: "video", quiz: "quiz" } as const;

export interface StudentTaskRowData {
  id: string;
  title: string;
  type: TaskType;
  deadline: Date;
  state: StudentTaskState;
  dueSoon: boolean;
  teacher: { user: { name: string } } | null;
  submission: { score: number | null; isLate: boolean; attemptsCount: number } | null;
}

export function StudentTaskRow({ task }: { task: StudentTaskRowData }) {
  return (
    <Link
      href={`/ojol/peserta/tugas/${task.id}`}
      className="group flex items-center gap-4 rounded-2xl bg-ojol-surface p-4 ring-1 ring-ojol-line transition-colors hover:ring-ojol-primary/40 sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ojol-primary-soft text-ojol-primary">
        <Icon name={TYPE_ICON[task.type]} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ojol-muted">
          <TypePill type={task.type} />
          {task.teacher && <span>{task.teacher.user.name}</span>}
          <span aria-hidden>·</span>
          <span title={formatDateTime(task.deadline)} className={task.dueSoon ? "font-medium text-ojol-danger" : ""}>
            Tenggat {deadlineLabel(task.deadline)}
          </span>
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        <TaskStatePill state={task.state} />
        <div className="flex gap-1.5">
          {task.submission?.score != null && <ScoreBadge score={task.submission.score} />}
          {task.submission && task.state !== "rejected" && <LatePill late={task.submission.isLate} />}
        </div>
      </div>
      <div className="sm:hidden">
        <TaskStatePill state={task.state} />
      </div>
      <Icon name="chevronRight" className="hidden h-4 w-4 shrink-0 text-ojol-muted transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
