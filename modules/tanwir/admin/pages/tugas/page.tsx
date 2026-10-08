import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { panelClasses } from "@/components/ui/panel";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { listAllTasks } from "@/modules/tanwir/api/tasks";
import { TASK_TYPE_LABEL, isTaskLocked, reviewReminderMessage, toWhatsappNumber, type TaskType } from "@/modules/tanwir/api/policy";
import { deleteTaskAsAdminAction } from "@/modules/tanwir/api/actions/admin";
import { AdminDeleteButton } from "@/modules/tanwir/components/admin/AdminForms";
import { formatDateTime } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Monitor Tugas · Tanwir Qurani" };

const FILTERS = [
  { key: "", label: "Semua" },
  { key: "menunggu", label: "Ada yang menunggu" },
  { key: "voice_note", label: TASK_TYPE_LABEL.voice_note },
  { key: "video", label: TASK_TYPE_LABEL.video },
  { key: "quiz", label: TASK_TYPE_LABEL.quiz },
];

export default async function TanwirTaskMonitorPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireTanwirAdmin();
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
      <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={item.key ? `/admin/tanwir/tugas?filter=${item.key}` : "/admin/tanwir/tugas"}
            className={cn("rounded-full px-3.5 py-1.5 text-sm", filter === item.key ? "bg-foreground text-background" : "bg-surface-muted text-foreground/60 hover:text-foreground")}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {tasks.length ? (
        <div className={panelClasses("overflow-x-auto")}>
          <Table>
            <Thead>
              <Tr>
                <Th>Tugas</Th>
                <Th>Guru</Th>
                <Th>Tenggat</Th>
                <Th>Terkumpul</Th>
                <Th>Menunggu</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {tasks.map((task) => {
                const pending = task.submissions.length;
                const phone = toWhatsappNumber(task.teacher?.phone);
                const reminder =
                  pending > 0 && phone && task.teacher
                    ? `https://wa.me/${phone}?text=${encodeURIComponent(reviewReminderMessage(task.teacher.user.name, task.title, pending))}`
                    : null;
                return (
                  <Tr key={task.id}>
                    <Td>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-foreground/50">{TASK_TYPE_LABEL[task.type]}</p>
                    </Td>
                    <Td className="text-foreground/70">{task.teacher ? task.teacher.user.name : <span className="text-foreground/40">Guru dihapus</span>}</Td>
                    <Td className={cn("whitespace-nowrap", isTaskLocked(task.deadline) ? "text-foreground/40" : "text-foreground/70")}>{formatDateTime(task.deadline)}</Td>
                    <Td className="tabular-nums">{task._count.submissions}</Td>
                    <Td className={cn("tabular-nums", pending ? "font-semibold text-foreground" : "text-foreground/50")}>{pending}</Td>
                    <Td className="whitespace-nowrap text-right">
                      {reminder && (
                        <a href={reminder} target="_blank" rel="noopener noreferrer" className="mr-4 text-sm font-medium text-success hover:underline">
                          Ingatkan via WA
                        </a>
                      )}
                      <AdminDeleteButton action={deleteTaskAsAdminAction.bind(null, task.id)} confirmText="Hapus tugas & setorannya?" />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </div>
      ) : (
        <EmptyState>Tidak ada tugas untuk filter ini.</EmptyState>
      )}
    </div>
  );
}
