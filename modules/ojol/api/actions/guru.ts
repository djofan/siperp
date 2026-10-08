"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertOjolMember, errorMessage } from "../access";
import { createTask, deleteTask, extendTask, updateTask } from "../tasks";
import { reviewSubmission } from "../submissions";
import type { ActionState } from "./state";

export async function saveTaskAction(taskId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertOjolMember("guru");
    if (taskId) await updateTask(taskId, member.id, form);
    else await createTask(member.id, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/ojol", "layout");
  redirect("/ojol/guru/tugas");
}

export async function deleteTaskAction(taskId: string): Promise<ActionState> {
  try {
    const { member } = await assertOjolMember("guru");
    await deleteTask(taskId, member.id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/ojol", "layout");
  return { error: "" };
}

export async function extendTaskAction(taskId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertOjolMember("guru");
    await extendTask(taskId, member.id, Number(form.get("hours")));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/ojol", "layout");
  return { error: "", message: "Tenggat diperpanjang." };
}

export async function reviewAction(submissionId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const decision = form.get("decision") === "approved" ? "approved" : "rejected";
  try {
    const { member } = await assertOjolMember("guru");
    await reviewSubmission(submissionId, member.id, decision, String(form.get("feedback") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/ojol", "layout");
  redirect(`/ojol/guru/koreksi?selesai=${decision}`);
}

