"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAcademyProfile } from "./access";
import { startQuiz, updateAttempt } from "./quizzes";
import { requireAcademyAdmin } from "./admin-access";
import * as curriculum from "./admin-curriculum";
import { orderField } from "./admin-validation";
import * as adminQuizzes from "./admin-quizzes";
import * as participants from "./admin-participants";
export type ActionState = {
    error: string;
    message?: string;
    credentials?: {
        code: string;
        email: string;
        password: string;
    }[];
};
function errorState(error: unknown): ActionState { return { error: error instanceof ApiError ? error.message : "Data belum dapat disimpan. Silakan coba lagi." }; }
const adminError = errorState;
async function mutate(path: string, body: FormData | Record<string, unknown>, method = "POST"): Promise<ActionState> { try {
    await apiRequest(path, { method, body: body instanceof FormData ? body : JSON.stringify(body) });
    revalidatePath("/academy", "layout");
    return { error: "" };
}
catch (error) {
    return errorState(error);
} }
export async function registerParticipant(_: ActionState, form: FormData): Promise<ActionState> { let result: {
    nip: string;
}; try {
    result = await apiRequest("academy/register", { method: "POST", body: form });
}
catch (error) {
    return errorState(error);
} redirect(`/academy/masuk?terdaftar=1&nip=${encodeURIComponent(result.nip)}`); }
export async function enrollInCourse(courseId: string): Promise<ActionState> { let result: {
    slug: string;
}; try {
    result = await apiRequest(`academy/courses/${encodeURIComponent(courseId)}/enroll`, { method: "POST" });
}
catch (error) {
    return errorState(error);
} revalidatePath("/academy", "layout"); redirect(`/academy/program/${result.slug}`); }
export async function markLesson(lessonId: string, completed: boolean): Promise<ActionState> { return mutate(`academy/lessons/${encodeURIComponent(lessonId)}/progress`, { completed }, "PUT"); }
export async function beginQuiz(quizId: string): Promise<ActionState> {
    const { profileId } = await requireAcademyProfile();
    let attemptId: string;
    try {
        attemptId = await startQuiz(profileId, quizId);
    }
    catch (error) {
        return errorState(error);
    }
    redirect(`/academy/kuis/${quizId}/percobaan/${attemptId}`);
}
export async function saveQuizAnswer(attemptId: string, questionId: string, optionId: string | string[]) {
    const { profileId } = await requireAcademyProfile();
    try {
        return { ...await updateAttempt(profileId, attemptId, { questionId, optionId }), error: "" };
    }
    catch (error) {
        return { completed: false, ...errorState(error) };
    }
}
export async function saveStudyNote(lessonId: string, _: ActionState, form: FormData): Promise<ActionState> { const result = await mutate(`academy/lessons/${encodeURIComponent(lessonId)}/note`, form, "PUT"); return result.error ? result : { ...result, message: "Catatan pribadi tersimpan." }; }
export async function changeAcademyPassword(_: ActionState, form: FormData): Promise<ActionState> { const result = await mutate("academy/profile/password", form, "PUT"); if (result.error)
    return result; (await cookies()).delete(SESSION_COOKIE_NAME); redirect("/academy/masuk?password=1"); }
export async function askTeacher(courseId: string, _: ActionState, form: FormData): Promise<ActionState> { return mutate(`academy/courses/${encodeURIComponent(courseId)}/questions`, form); }
export async function answerParticipant(id: string, _: ActionState, form: FormData): Promise<ActionState> { return mutate(`academy/discussions/${encodeURIComponent(id)}/answer`, form, "PUT"); }
export async function saveTeacherAudio(lessonId: string, _: ActionState, form: FormData): Promise<ActionState> { return mutate(`academy/lessons/${encodeURIComponent(lessonId)}/audio`, form, "PUT"); }
export async function saveTeacherSession(courseId: string, _: ActionState, form: FormData): Promise<ActionState> { return mutate(`academy/courses/${encodeURIComponent(courseId)}/sessions`, form); }
export async function finishQuiz(attemptId: string) {
    const { profileId } = await requireAcademyProfile();
    try {
        const result = await updateAttempt(profileId, attemptId, undefined, true);
        revalidatePath("/academy", "layout");
        return { error: "", href: `/academy/kuis/${result.quizId}/hasil/${attemptId}` };
    }
    catch (error) {
        return { ...errorState(error), href: "" };
    }
}
function refreshCurriculum() {
    revalidatePath("/admin/academy", "layout");
    revalidatePath("/academy", "layout");
}
export async function saveAcademyCourse(id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    let saved: {
        id: string;
    };
    try {
        saved = await curriculum.saveCourse(id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(`/admin/academy/program/${saved.id}?tersimpan=1`);
}
export async function saveAcademyChapter(courseId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    let saved: {
        id: string;
    };
    try {
        saved = await curriculum.saveChapter(courseId, id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(`/admin/academy/program/${courseId}/bab/${saved.id}?tersimpan=1`);
}
export async function saveAcademyLesson(courseId: string, chapterId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    let saved: {
        id: string;
    };
    try {
        saved = await curriculum.saveLesson(courseId, chapterId, id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(`/admin/academy/program/${courseId}/bab/${chapterId}/materi/${saved.id}?tersimpan=1`);
}
export async function saveAcademyAttachment(courseId: string, chapterId: string, lessonId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    try {
        await curriculum.saveAttachment(courseId, chapterId, lessonId, id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(`/admin/academy/materi/${lessonId}?tersimpan=1#lampiran`);
}
export async function reorderAcademyContent(courseId: string, chapterId: string, lessonId: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    try {
        await curriculum.setContentOrder(courseId, chapterId, lessonId, orderField(form));
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    return { error: "" };
}
export async function deleteAcademyContent(courseId: string, chapterId: string | null, lessonId: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    if (form.get("confirm") !== "on")
        return { error: "Centang konfirmasi sebelum menghapus konten." };
    if (lessonId && !chapterId)
        return { error: "Bab materi tidak valid." };
    try {
        await curriculum.deleteContent(courseId, chapterId, lessonId);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(lessonId ? `/admin/academy/program/${courseId}/bab/${chapterId}` : chapterId ? `/admin/academy/program/${courseId}` : "/admin/academy/program");
}
export async function deleteAcademyAttachment(courseId: string, chapterId: string, lessonId: string, id: string, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    if (form.get("confirm") !== "on")
        return { error: "Centang konfirmasi sebelum menghapus lampiran." };
    try {
        await curriculum.deleteAttachment(courseId, chapterId, lessonId, id);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(`/admin/academy/materi/${lessonId}?tersimpan=1#lampiran`);
}
function adminQuizPath(courseId: string, chapterId: string, quizId: string) {
    return `/admin/academy/program/${courseId}/bab/${chapterId}/kuis/${quizId}`;
}
export async function saveAcademyQuiz(courseId: string, chapterId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    let saved: {
        id: string;
    };
    try {
        saved = await adminQuizzes.saveAdminQuiz(courseId, chapterId, id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(adminQuizPath(courseId, chapterId, saved.id) + "?tersimpan=1");
}
export async function saveAcademyQuestion(courseId: string, chapterId: string, quizId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    try {
        await adminQuizzes.saveAdminQuestion(courseId, chapterId, quizId, id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(adminQuizPath(courseId, chapterId, quizId) + "?tersimpan=1#pertanyaan");
}
export async function deleteAcademyQuestion(courseId: string, chapterId: string, quizId: string, id: string, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    if (form.get("confirm") !== "on")
        return { error: "Centang konfirmasi penghapusan." };
    try {
        await adminQuizzes.deleteAdminQuestion(courseId, chapterId, quizId, id);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect(adminQuizPath(courseId, chapterId, quizId) + "?tersimpan=1#pertanyaan");
}
export async function deleteAcademyQuiz(courseId: string, chapterId: string, quizId: string, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    if (form.get("confirm") !== "on")
        return { error: "Centang konfirmasi penghapusan." };
    try {
        await adminQuizzes.deleteAdminQuiz(courseId, chapterId, quizId);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect("/admin/academy/kuis");
}
export async function syncAcademyCompletion(enrollmentId: string): Promise<ActionState> {
    await requireAcademyAdmin();
    let record: {
        id: string;
    };
    try {
        record = await participants.syncAdminCompletion(enrollmentId);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect("/admin/academy/sertifikat/" + record.id + "?tersimpan=1");
}
export async function saveAcademyCertificate(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    try {
        await participants.saveAdminCertificate(id, form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect("/admin/academy/sertifikat/" + id + "?tersimpan=1");
}
export async function deleteAcademyCompletion(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    if (form.get("confirm") !== "on")
        return { error: "Centang konfirmasi penghapusan." };
    try {
        await participants.deleteAdminCompletion(id);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect("/admin/academy/sertifikat");
}
export async function saveAcademyMaintenance(_state: ActionState, form: FormData): Promise<ActionState> {
    await requireAcademyAdmin();
    try {
        await participants.saveAdminMaintenance(form);
    }
    catch (error) {
        return adminError(error);
    }
    refreshCurriculum();
    redirect("/admin/academy/pengaturan?tersimpan=1");
}
