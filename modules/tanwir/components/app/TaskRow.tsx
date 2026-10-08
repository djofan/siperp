import Link from "next/link";
import type { StudentTaskState, TaskType } from "@/modules/tanwir/api/policy";
import { Icon } from "@/modules/tanwir/components/icons";
import { LatePill, ScoreBadge, TaskStatePill, TypePill, deadlineLabel, formatDateTime } from "@/modules/tanwir/components/ui";

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
  const relativeDeadline = deadlineLabel(task.deadline);
  return (
    <Link
      href={`/tanwir/peserta/tugas/${task.id}`}
      className="group flex items-center gap-4 rounded-2xl bg-tanwir-surface p-4 ring-1 ring-tanwir-line transition-colors hover:bg-tanwir-paper sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center text-tanwir-muted">
        <Icon name={TYPE_ICON[task.type]} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tanwir-muted">
          <TypePill type={task.type} />
          {task.teacher && <span>{task.teacher.user.name}</span>}
          <span aria-hidden>·</span>
          <span className={relativeDeadline.startsWith("lewat") ? "font-medium text-tanwir-danger" : task.dueSoon ? "font-medium text-tanwir-warning" : ""}>
            {formatDateTime(task.deadline)} · {relativeDeadline}
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
      <Icon name="chevronRight" className="hidden h-4 w-4 shrink-0 text-tanwir-muted sm:block" />
    </Link>
  );
}
