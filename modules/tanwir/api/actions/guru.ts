"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertTanwirMember, errorMessage } from "../access";
import { createTask, deleteTask, extendTask, updateTask } from "../tasks";
import { reviewSubmission } from "../submissions";
import { deleteStudent, saveStudent } from "../students";
import type { ActionState } from "./state";

export async function saveTaskAction(taskId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("guru");
    if (taskId) await updateTask(taskId, member.id, form);
    else await createTask(member.id, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  redirect("/tanwir/guru/tugas");
}

export async function deleteTaskAction(taskId: string): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("guru");
    await deleteTask(taskId, member.id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  return { error: "" };
}

export async function extendTaskAction(taskId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("guru");
    await extendTask(taskId, member.id, Number(form.get("hours")));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  return { error: "", message: "Tenggat diperpanjang." };
}

export async function reviewAction(submissionId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const decision = form.get("decision") === "approved" ? "approved" : "rejected";
  try {
    const { member } = await assertTanwirMember("guru");
    await reviewSubmission(submissionId, member.id, decision, String(form.get("feedback") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  redirect(`/tanwir/guru/koreksi?selesai=${decision}`);
}

export async function saveStudentAsGuruAction(studentId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("guru");
    await saveStudent({ kind: "guru", teacherId: member.id }, studentId, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  redirect("/tanwir/guru/anak-didik");
}

export async function deleteStudentAsGuruAction(studentId: string): Promise<ActionState> {
  try {
    const { member } = await assertTanwirMember("guru");
    await deleteStudent({ kind: "guru", teacherId: member.id }, studentId);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
  return { error: "" };
}
