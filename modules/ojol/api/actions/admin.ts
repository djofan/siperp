"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertOjolAdmin, errorMessage, type OjolMemberRole } from "../access";
import { createMember, deleteMember, setMemberActive, updateMember } from "../members";
import { createGroup, deleteGroup, updateGroup } from "../groups";
import { deleteTask } from "../tasks";
import type { ActionState } from "./state";

const PATH: Record<OjolMemberRole, string> = { guru: "/admin/ojol/guru", peserta: "/admin/ojol/peserta" };

export async function saveMemberAction(
  role: OjolMemberRole,
  memberId: string | null,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let createdCode = "";
  try {
    await assertOjolAdmin();
    if (memberId) await updateMember(memberId, role, form);
    else createdCode = (await createMember(role, form)).code;
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/ojol", "layout");
  redirect(createdCode ? `${PATH[role]}?dibuat=${createdCode}` : PATH[role]);
}

export async function toggleMemberActiveAction(memberId: string, isActive: boolean): Promise<ActionState> {
  try {
    await assertOjolAdmin();
    await setMemberActive(memberId, isActive);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/ojol", "layout");
  return { error: "" };
}

export async function deleteMemberAction(role: OjolMemberRole, memberId: string): Promise<ActionState> {
  try {
    await assertOjolAdmin();
    await deleteMember(memberId, role);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/ojol", "layout");
  return { error: "" };
}

export async function saveGroupAction(groupId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertOjolAdmin();
    if (groupId) await updateGroup(groupId, form);
    else await createGroup(form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/ojol", "layout");
  redirect("/admin/ojol/kelompok");
}

export async function deleteGroupAction(groupId: string): Promise<ActionState> {
  try {
    await assertOjolAdmin();
    await deleteGroup(groupId);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/ojol", "layout");
  return { error: "" };
}

export async function deleteTaskAsAdminAction(taskId: string): Promise<ActionState> {
  try {
    await assertOjolAdmin();
    await deleteTask(taskId, null);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/admin/ojol", "layout");
  return { error: "" };
}

