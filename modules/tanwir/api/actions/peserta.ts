"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertTanwirMember, errorMessage } from "../access";
import { submitQuiz } from "../submissions";
import { deleteStudent, saveStudent } from "../students";
import type { ActionState } from "./state";

export async function submitQuizAction(taskId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("peserta");
    const answers: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (key.startsWith("q_") && typeof value === "string") answers[key.slice(2)] = value;
    }
    await submitQuiz(taskId, member, answers);
  } catch (error) {
    return { error: errorMessage(error, "Kuis gagal dikirim. Coba lagi.") };
  }
  revalidatePath("/tanwir", "layout");
  redirect(`/tanwir/peserta/tugas/${taskId}?selesai=1`);
}

export async function saveStudentAsPesertaAction(studentId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("peserta");
    await saveStudent({ kind: "peserta", memberId: member.id }, studentId, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  redirect("/tanwir/peserta/anak-didik");
}

export async function deleteStudentAsPesertaAction(studentId: string): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("peserta");
    await deleteStudent({ kind: "peserta", memberId: member.id }, studentId);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  return { error: "" };
}
