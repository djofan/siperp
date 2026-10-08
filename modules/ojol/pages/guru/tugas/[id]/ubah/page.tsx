import { notFound, redirect } from "next/navigation";
import { groupOptions, guruOptions } from "@/modules/ojol/api/groups";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { getTeacherTask } from "@/modules/ojol/api/tasks";
import { saveTaskAction } from "@/modules/ojol/api/actions/guru";
import { TaskForm } from "@/modules/ojol/components/app/TaskForm";
import { Card, PageTitle, toWibInputValue } from "@/modules/ojol/components/ui";
import type { QuizOption } from "@/modules/ojol/api/policy";

export const metadata = { title: "Ubah Tugas" };

export default async function GuruEditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireOjolMember("guru");
  const { id } = await params;
  const task = await getTeacherTask(id, viewer.member.id);
  if (!task) notFound();
  // Co-reviewer hanya boleh melihat hasil, bukan mengubah tugas.
  if (!task.canManage) redirect(`/ojol/guru/tugas/${task.id}`);
  const [groups, gurus] = await Promise.all([groupOptions(), guruOptions()]);
  const hasSubmissions = task._count.submissions > 0;

  return (
    <div className="max-w-3xl">
      <PageTitle title="Ubah tugas" description={task.title} />
      <Card>
        <TaskForm
          action={saveTaskAction.bind(null, task.id)}
          minDeadline={toWibInputValue(new Date())}
          typeLocked={hasSubmissions}
          questionsLocked={hasSubmissions}
          groups={groups}
          gurus={gurus.filter((guru) => guru.id !== viewer.member.id && (guru.user.isActive || task.approvers.some((item) => item.teacherId === guru.id)))}
          initial={{
            title: task.title,
            description: task.description,
            type: task.type,
            deadline: toWibInputValue(task.deadline),
            groupIds: task.groups.map((item) => item.group.id),
            approverIds: task.approvers.map((item) => item.teacherId),
            questions: task.questions.map((question) => ({
              key: question.id,
              question: question.question,
              optionA: question.optionA,
              optionB: question.optionB,
              optionC: question.optionC ?? "",
              optionD: question.optionD ?? "",
              correctOption: question.correctOption as QuizOption,
            })),
          }}
        />
      </Card>
    </div>
  );
}
