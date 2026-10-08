import type { SubmissionStatus } from "@/modules/ojol/api/policy";
import { SubmissionPill, formatDateTime } from "@/modules/ojol/components/ui";

export interface ReviewLogView {
  id: string;
  status: SubmissionStatus;
  feedback: string | null;
  attemptNumber: number;
  createdAt: Date;
  reviewer: { user: { name: string } } | null;
}

export function ReviewHistory({ logs }: { logs: ReviewLogView[] }) {
  if (!logs.length) return <p className="text-sm text-ojol-muted">Belum ada koreksi.</p>;
  return (
    <ol className="space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="relative pl-5">
          <span className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${log.status === "approved" ? "bg-ojol-success" : "bg-ojol-danger"}`} />
          <div className="flex flex-wrap items-center gap-2">
            <SubmissionPill status={log.status} />
            <span className="text-xs text-ojol-muted">
              Percobaan ke-{log.attemptNumber} · {formatDateTime(log.createdAt)}
            </span>
          </div>
          {log.feedback && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{log.feedback}</p>}
          {log.reviewer && <p className="mt-1 text-xs text-ojol-muted">— {log.reviewer.user.name}</p>}
        </li>
      ))}
    </ol>
  );
}
