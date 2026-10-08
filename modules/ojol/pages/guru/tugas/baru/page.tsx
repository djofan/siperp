import { requireOjolMember } from "@/modules/ojol/api/access";
import { groupOptions, guruOptions } from "@/modules/ojol/api/groups";
import { saveTaskAction } from "@/modules/ojol/api/actions/guru";
import { TaskForm } from "@/modules/ojol/components/app/TaskForm";
import { Card, PageTitle, toWibInputValue } from "@/modules/ojol/components/ui";

export const metadata = { title: "Buat Tugas" };

export default async function GuruNewTaskPage() {
  const viewer = await requireOjolMember("guru");
  const [groups, gurus] = await Promise.all([groupOptions(), guruOptions()]);
  return (
    <div className="max-w-3xl">
      <PageTitle title="Buat tugas" description="Pilih kelompok penerima dan, bila perlu, guru lain sebagai co-reviewer." />
      <Card>
        <TaskForm
          action={saveTaskAction.bind(null, null)}
          minDeadline={toWibInputValue(new Date())}
          groups={groups}
          gurus={gurus.filter((guru) => guru.id !== viewer.member.id && guru.user.isActive)}
        />
      </Card>
    </div>
  );
}
