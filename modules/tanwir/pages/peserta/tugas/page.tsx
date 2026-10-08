import Link from "next/link";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { listStudentTasks } from "@/modules/tanwir/api/submissions";
import { StudentTaskRow } from "@/modules/tanwir/components/app/TaskRow";
import { Empty, PageTitle } from "@/modules/tanwir/components/ui";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "todo", label: "Belum" },
  { key: "rejected", label: "Perlu diulang" },
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Selesai" },
  { key: "locked", label: "Terkunci" },
] as const;

export default async function PesertaTasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const viewer = await requireTanwirMember("peserta");
  const { status = "semua" } = await searchParams;
  const tasks = await listStudentTasks(viewer.member);
  const shown = status === "semua" ? tasks : tasks.filter((task) => task.state === status);

  return (
    <div>
      <PageTitle title="Tugas" description="Tugas dari guru PIC untuk kelompok Anda, diurutkan dari tenggat terdekat." />
      <nav aria-label="Filter status" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((filter) => {
          const count = filter.key === "semua" ? tasks.length : tasks.filter((task) => task.state === filter.key).length;
          const active = status === filter.key;
          return (
            <Link
              key={filter.key}
              href={filter.key === "semua" ? "/tanwir/peserta/tugas" : `/tanwir/peserta/tugas?status=${filter.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors",
                active ? "bg-tanwir-ink text-white" : "bg-tanwir-surface text-tanwir-muted ring-1 ring-tanwir-line hover:text-tanwir-ink",
              )}
            >
              {filter.label}
              <span className={cn("tabular-nums text-xs", active ? "text-white/60" : "text-tanwir-muted/70")}>{count}</span>
            </Link>
          );
        })}
      </nav>
      {shown.length ? (
        <div className="space-y-3">
          {shown.map((task) => (
            <StudentTaskRow key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <Empty title="Belum ada tugas di sini." />
      )}
    </div>
  );
}
