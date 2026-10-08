import { notFound } from "next/navigation";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { getTeacherTask } from "@/modules/tanwir/api/tasks";
import { saveTaskAction } from "@/modules/tanwir/api/actions/guru";
import { TaskForm } from "@/modules/tanwir/components/app/TaskForm";
import { Card, PageTitle, toWibInputValue } from "@/modules/tanwir/components/ui";
import type { QuizOption } from "@/modules/tanwir/api/policy";

export const metadata = { title: "Ubah Tugas" };

export default async function GuruEditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireTanwirMember("guru");
  const { id } = await params;
  const task = await getTeacherTask(id, viewer.member.id);
  if (!task) notFound();
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
          initial={{
            title: task.title,
            description: task.description,
            type: task.type,
            deadline: toWibInputValue(task.deadline),
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
