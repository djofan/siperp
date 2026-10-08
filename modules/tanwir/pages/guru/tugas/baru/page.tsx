import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { saveTaskAction } from "@/modules/tanwir/api/actions/guru";
import { TaskForm } from "@/modules/tanwir/components/app/TaskForm";
import { Card, PageTitle, toWibInputValue } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Buat Tugas" };

export default async function GuruNewTaskPage() {
  await requireTanwirMember("guru");
  return (
    <div className="max-w-3xl">
      <PageTitle title="Buat tugas" description="Tugas langsung terkirim ke semua kelompok yang Anda PIC-i." />
      <Card>
        <TaskForm action={saveTaskAction.bind(null, null)} minDeadline={toWibInputValue(new Date())} />
      </Card>
    </div>
  );
}
