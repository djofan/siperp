"use server";
import { revalidatePath } from "next/cache";
import { getOjolViewer, errorMessage, OjolError } from "../access";
import { changeOwnPassword, updateOwnProfile } from "../members";
import type { ActionState } from "./state";

async function currentMember() {
  const viewer = await getOjolViewer();
  if (!viewer?.member) throw new OjolError("Tidak diizinkan.");
  return { userId: viewer.userId, memberId: viewer.member.id };
}

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { memberId } = await currentMember();
    await updateOwnProfile(memberId, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/ojol", "layout");
  return { error: "", message: "Profil tersimpan." };
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { userId } = await currentMember();
    await changeOwnPassword(userId, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  return { error: "", message: "Password berhasil diganti." };
}
