import "server-only";
import { apiRequest } from "@/lib/api";
export interface ExamNotification {
    key: string;
    quizId: string;
    title: string;
    course: string;
    opensAt: Date;
    closesAt: Date | null;
    state: "missed" | "upcoming" | "due" | "open";
    read: boolean;
}
export type GetExamNotificationsResult = ExamNotification[];
export async function getExamNotifications(_profileId: string): Promise<GetExamNotificationsResult> { return await apiRequest<GetExamNotificationsResult>("academy/notifications"); }
