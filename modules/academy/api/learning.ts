import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import { cache } from "react";
import { quizDeadline } from "./policy";
export const getLearningSettings = cache(async () => apiRequest<{
    csPhone: string;
    weights: {
        DAILY: number;
        WEEKLY: number;
        FINAL: number;
    };
}>("academy/settings/learning"));
export type GetIntakeResult = {
    course: {
        id: string;
        title: string;
        teacher: string;
        quota: number;
        durationDays: number;
        startsAt: Date | null;
        _count: {
            enrollments: number;
        };
    } | {
        id: string;
        title: string;
        teacher: string;
        quota: number;
        durationDays: number;
        startsAt: Date | null;
        _count: {
            enrollments: number;
        };
    } | null;
    filled: number;
    full: boolean;
};
export async function getIntake(): Promise<GetIntakeResult> {
    return await apiRequest<{
        course: {
            id: string;
            title: string;
            teacher: string;
            quota: number;
            durationDays: number;
            startsAt: Date | null;
            _count: {
                enrollments: number;
            };
        } | {
            id: string;
            title: string;
            teacher: string;
            quota: number;
            durationDays: number;
            startsAt: Date | null;
            _count: {
                enrollments: number;
            };
        } | null;
        filled: number;
        full: boolean;
    }>("academy/intake");
}
