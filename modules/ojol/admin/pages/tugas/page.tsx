import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { listAllTasks } from "@/modules/ojol/api/tasks";
import { TASK_TYPE_LABEL, isTaskLocked, reviewReminderMessage, toWhatsappNumber, type TaskType } from "@/modules/ojol/api/policy";
import { deleteTaskAsAdminAction } from "@/modules/ojol/api/actions/admin";
import { AdminDeleteButton } from "@/modules/ojol/components/admin/AdminForms";
import { deadlineLabel, formatDateTime } from "@/modules/ojol/components/ui";
import { DirectorySummary } from "@/modules/ojol/components/admin/DirectorySummary";
import { DirectoryTable } from "@/modules/ojol/components/admin/DirectoryTable";

export const metadata = { title: "Monitor Tugas · Ojol Mengaji" };

const FILTERS = [
  { key: "", label: "Semua" },
  { key: "menunggu", label: "Ada yang menunggu" },
  { key: "voice_note", label: TASK_TYPE_LABEL.voice_note },
  { key: "video", label: TASK_TYPE_LABEL.video },
  { key: "quiz", label: TASK_TYPE_LABEL.quiz },
];

export default async function OjolTaskMonitorPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireOjolAdmin();
  const { filter = "" } = await searchParams;
  const all = await listAllTasks();
  const tasks = all.filter((task) => {
    if (filter === "menunggu") return task.submissions.length > 0;
    if (["voice_note", "video", "quiz"].includes(filter)) return task.type === (filter as TaskType);
    return true;
  });

  return (
    <div>
      <PageHeader title="Monitor tugas" description="Semua tugas lintas guru. Ingatkan guru lewat WhatsApp bila ada setoran yang menunggu koreksi." />
      <div className="mb-5"><DirectorySummary items={[
        { label: "Total tugas", value: all.length, detail: "Lintas guru dan kelompok", icon: "tasks" },
        { label: "Kuis", value: all.filter(task => task.type === "quiz").length, detail: "Penilaian kuis otomatis", icon: "quiz" },
        { label: "Setoran masuk", value: all.reduce((sum,task) => sum + task._count.submissions,0), detail: "Pengumpulan peserta", icon: "upload" },
        { label: "Menunggu review", value: all.reduce((sum,task) => sum + task.submissions.length,0), detail: "Perlu ditinjau guru", icon: "clock" },
      ]} /></div>
      <DirectoryTable label="tugas" placeholder="Cari tugas atau guru" columns={["Tugas", "Guru", "Tenggat", "Terkumpul", "Menunggu", "Aksi"]} filters={<nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key ? `/admin/ojol/tugas?filter=${item.key}` : "/admin/ojol/tugas"}
            className={cn("rounded-full px-3.5 py-1.5 text-xs", filter === item.key ? "bg-ojol-primary text-white" : "bg-white text-ojol-muted hover:text-ojol-primary")}
          >
            {item.label}
          </Link>
        ))}
      </nav>} rows={tasks.map((task) => {
                const pending = task.submissions.length;
                const phone = toWhatsappNumber(task.teacher?.phone);
                const reminder =
                  pending > 0 && phone && task.teacher
                    ? `https://wa.me/${phone}?text=${encodeURIComponent(reviewReminderMessage(task.teacher.user.name, task.title, pending))}`
                    : null;
                return { id: task.id, search: `${task.title} ${task.teacher?.user.name ?? ""}`, cells: [
                    <div key="title"><p className="font-medium">{task.title}</p><p className="text-xs text-ojol-muted">{TASK_TYPE_LABEL[task.type]}</p></div>,
                    task.teacher?.user.name ?? "Guru dihapus",
                    <div key="deadline" className={cn("whitespace-nowrap", isTaskLocked(task.deadline) ? "text-ojol-danger" : "text-ojol-muted")}><p>{formatDateTime(task.deadline)}</p><p className="text-xs">{deadlineLabel(task.deadline)}</p></div>,
                    task._count.submissions,
                    <span key="pending" className={pending ? "directory-group" : "text-ojol-muted"}>{pending}</span>,
                    <div key="actions" className="flex items-center justify-end gap-2 whitespace-nowrap">
                      {reminder && (
                        <a href={reminder} target="_blank" rel="noopener noreferrer" className="mr-4 text-sm font-medium text-success hover:underline">
                          Ingatkan via WA
                        </a>
                      )}
                      <AdminDeleteButton iconOnly action={deleteTaskAsAdminAction.bind(null, task.id)} confirmText="Hapus tugas & setorannya?" />
                    </div>,
                  ] };
              })} />
    </div>
  );
}
