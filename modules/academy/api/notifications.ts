import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import { cache } from "react";
import { quizDeadline } from "./policy";
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
export async function getExamNotifications(profileId: string): Promise<GetExamNotificationsResult> { return await apiRequest<GetExamNotificationsResult>("academy/notifications"); }
