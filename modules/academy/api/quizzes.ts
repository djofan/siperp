import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import { quizDeadline } from "./policy";
export function remainingQuizSeconds(startedAt: Date, minutes: number, closesAt?: string | null) {
    return Math.ceil((quizDeadline(startedAt, minutes, closesAt) - Date.now()) / 1000);
}
export type StartQuizResult = string;
export async function startQuiz(profileId: string, quizId: string): Promise<StartQuizResult> { return await apiRequest<StartQuizResult>(`academy/quizzes/${encodeURIComponent(quizId)}/attempts`, { method: "POST" }); }
export type UpdateAttemptResult = {
    completed: boolean;
    quizId: string;
};
export async function updateAttempt(profileId: string, attemptId: string, answer?: {
    questionId: string;
    optionId: string | string[];
}, submit = false): Promise<UpdateAttemptResult> { return await apiRequest<UpdateAttemptResult>(`academy/attempts/${encodeURIComponent(attemptId)}`, { method: "PUT", body: JSON.stringify({ answer, submit }) }); }
export type GetOwnAttemptResult = ({
    quiz: {
        title: string;
        closesAt: Date | null;
    };
} & {
    id: string;
    createdAt: Date;
    profileId: string;
    score: number | null;
    submittedAt: Date | null;
    attemptNumber: number;
    answers: Domain.JsonValue;
    quizId: string;
    passed: boolean | null;
    startedAt: Date;
    isCompleted: boolean;
}) | ({
    quiz: {
        title: string;
        closesAt: Date | null;
    };
} & {
    id: string;
    createdAt: Date;
    profileId: string;
    score: number | null;
    submittedAt: Date | null;
    attemptNumber: number;
    answers: Domain.JsonValue;
    quizId: string;
    passed: boolean | null;
    startedAt: Date;
    isCompleted: boolean;
}) | null;
export async function getOwnAttempt(profileId: string, quizId: string, attemptId: string): Promise<GetOwnAttemptResult> {
    try {
        return await apiRequest<({
            quiz: {
                title: string;
                closesAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            profileId: string;
            score: number | null;
            submittedAt: Date | null;
            attemptNumber: number;
            answers: Domain.JsonValue;
            quizId: string;
            passed: boolean | null;
            startedAt: Date;
            isCompleted: boolean;
        }) | ({
            quiz: {
                title: string;
                closesAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            profileId: string;
            score: number | null;
            submittedAt: Date | null;
            attemptNumber: number;
            answers: Domain.JsonValue;
            quizId: string;
            passed: boolean | null;
            startedAt: Date;
            isCompleted: boolean;
        }) | null>(`academy/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
