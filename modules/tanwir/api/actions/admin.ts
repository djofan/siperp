"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertTanwirAdmin, errorMessage, type TanwirMemberRole } from "../access";
import { createMember, deleteMember, setMemberActive, updateMember } from "../members";
import { createGroup, deleteGroup, updateGroup } from "../groups";
import { deleteTask } from "../tasks";
import { deleteStudent, saveStudent } from "../students";
import type { ActionState } from "./state";

const PATH: Record<TanwirMemberRole, string> = { guru: "/admin/tanwir/guru", peserta: "/admin/tanwir/peserta" };

export async function saveMemberAction(
  role: TanwirMemberRole,
  memberId: string | null,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let createdCode = "";
  try {
    await assertTanwirAdmin();
    if (memberId) await updateMember(memberId, role, form);
    else createdCode = (await createMember(role, form)).code;
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  redirect(createdCode ? `${PATH[role]}?dibuat=${createdCode}` : PATH[role]);
}

export async function toggleMemberActiveAction(memberId: string, isActive: boolean): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    await setMemberActive(memberId, isActive);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  return { error: "" };
}

export async function deleteMemberAction(role: TanwirMemberRole, memberId: string): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    await deleteMember(memberId, role);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  return { error: "" };
}

export async function saveGroupAction(groupId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    if (groupId) await updateGroup(groupId, form);
    else await createGroup(form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  redirect("/admin/tanwir/kelompok");
}

export async function deleteGroupAction(groupId: string): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    await deleteGroup(groupId);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  return { error: "" };
}

export async function deleteTaskAsAdminAction(taskId: string): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    await deleteTask(taskId, null);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  return { error: "" };
}

export async function saveStudentAsAdminAction(studentId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    await saveStudent({ kind: "admin" }, studentId, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  redirect("/admin/tanwir/anak-didik");
}

export async function deleteStudentAsAdminAction(studentId: string): Promise<ActionState> {
  try {
    await assertTanwirAdmin();
    await deleteStudent({ kind: "admin" }, studentId);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/tanwir", "layout");
  return { error: "" };
}
