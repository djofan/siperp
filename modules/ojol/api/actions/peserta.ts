"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertOjolMember, errorMessage } from "../access";
import { submitQuiz } from "../submissions";
import type { ActionState } from "./state";

export async function submitQuizAction(taskId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertOjolMember("peserta");
    const answers: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (key.startsWith("q_") && typeof value === "string") answers[key.slice(2)] = value;
    }
    await submitQuiz(taskId, member, answers);
  } catch (error) {
    return { error: errorMessage(error, "Kuis gagal dikirim. Coba lagi.") };
  }
  revalidatePath("/ojol", "layout");
  redirect(`/ojol/peserta/tugas/${taskId}?selesai=1`);
}

