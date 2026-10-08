"use server";
import { revalidatePath } from "next/cache";
import { getTanwirViewer, errorMessage, TanwirError } from "../access";
import { changeOwnPassword, updateOwnProfile } from "../members";
import type { ActionState } from "./state";

async function currentMember() {
  const viewer = await getTanwirViewer();
  if (!viewer?.member) throw new TanwirError("Tidak diizinkan.");
  return { userId: viewer.userId, memberId: viewer.member.id };
}

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { memberId } = await currentMember();
    await updateOwnProfile(memberId, form);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/tanwir", "layout");
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
