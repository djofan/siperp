import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
export type ListStudentTasksResult = {
    submission: {
        score: number | null;
        status: Domain.TanwirSubmissionStatus;
        attemptsCount: number;
        isLate: boolean;
    };
    locked: boolean;
    state: import("./policy").StudentTaskState;
    dueSoon: boolean;
    id: string;
    description: string;
    title: string;
    teacher: {
        user: {
            name: string;
        };
    } | null;
    type: Domain.TanwirTaskType;
    deadline: Date;
}[];
export async function listStudentTasks(_member: {
    id: string;
    groupId: string | null;
}): Promise<ListStudentTasksResult> { return apiCollection<(ListStudentTasksResult)[number]>("tanwir/student/tasks"); }
export type GetStudentTaskDetailResult = {
    task: {
        id: string;
        description: string;
        title: string;
        teacher: {
            user: {
                name: string;
            };
        } | null;
        type: Domain.TanwirTaskType;
        deadline: Date;
        originalDeadline: Date;
    };
    submission: {
        id: string;
        score: number | null;
        answers: {
            questionId: string;
            selectedOption: string;
            isCorrect: boolean;
        }[];
        submittedAt: Date;
        fileMime: string | null;
        status: Domain.TanwirSubmissionStatus;
        attemptsCount: number;
        isLate: boolean;
        logs: {
            id: string;
            createdAt: Date;
            attemptNumber: number;
            status: Domain.TanwirSubmissionStatus;
            feedback: string | null;
            reviewer: {
                user: {
                    name: string;
                };
            } | null;
        }[];
    } | null;
    questions: {
        id: string;
        question: string;
        optionA: string;
        optionB: string;
        optionC: string | null;
        optionD: string | null;
        correctOption: string;
    }[];
    locked: boolean;
    canSubmit: boolean;
    state: import("./policy").StudentTaskState;
} | null;
export async function getStudentTaskDetail(taskId: string, _member: {
    id: string;
    groupId: string | null;
}): Promise<GetStudentTaskDetailResult> { try {
    return await apiRequest<GetStudentTaskDetailResult>(`tanwir/student/tasks/${encodeURIComponent(taskId)}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export type SubmitQuizResult = {
    score: number;
    correct: number;
    total: number;
    isLate: boolean;
};
export async function submitQuiz(taskId: string, member: {
    id: string;
    groupId: string | null;
}, answers: Record<string, string>): Promise<SubmitQuizResult> { return apiRequest<SubmitQuizResult>(`tanwir/tasks/${encodeURIComponent(taskId)}/quiz-attempts`, { method: "POST", body: JSON.stringify({ answers }) }); }
export type ListReviewQueueResult = {
    id: string;
    submittedAt: Date;
    attemptsCount: number;
    isLate: boolean;
    task: {
        id: string;
        title: string;
        type: Domain.TanwirTaskType;
    };
    student: {
        code: string;
        user: {
            name: string;
        };
    };
}[];
export async function listReviewQueue(_teacherId: string): Promise<ListReviewQueueResult> { return apiCollection<(ListReviewQueueResult)[number]>("tanwir/review-queue"); }
export type GetSubmissionForReviewResult = {
    id: string;
    score: number | null;
    answers: {
        question: {
            id: string;
            order: number;
            question: string;
            optionA: string;
            optionB: string;
            optionC: string | null;
            optionD: string | null;
            correctOption: string;
        };
        questionId: string;
        selectedOption: string;
        isCorrect: boolean;
    }[];
    submittedAt: Date;
    filePath: string | null;
    fileMime: string | null;
    status: Domain.TanwirSubmissionStatus;
    attemptsCount: number;
    isLate: boolean;
    task: {
        id: string;
        description: string;
        title: string;
        type: Domain.TanwirTaskType;
    };
    student: {
        code: string;
        teachingPlace: string | null;
        user: {
            name: string;
        };
        group: {
            name: string;
        } | null;
    };
    logs: {
        id: string;
        createdAt: Date;
        attemptNumber: number;
        status: Domain.TanwirSubmissionStatus;
        feedback: string | null;
        reviewer: {
            user: {
                name: string;
            };
        } | null;
    }[];
} | null;
export async function getSubmissionForReview(submissionId: string, _teacherId: string): Promise<GetSubmissionForReviewResult> { try {
    return await apiRequest<GetSubmissionForReviewResult>(`tanwir/submissions/${encodeURIComponent(submissionId)}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export type ReviewSubmissionResult = void;
export async function reviewSubmission(submissionId: string, reviewerId: string, decision: "approved" | "rejected", feedback: string): Promise<ReviewSubmissionResult> { await apiRequest(`tanwir/submissions/${encodeURIComponent(submissionId)}/reviews`, { method: "POST", body: JSON.stringify({ decision, feedback }) }); }
export type ListTaskResultsResult = {
    id: string;
    _count: {
        answers: number;
    };
    score: number | null;
    answers: {
        id: string;
    }[];
    submittedAt: Date;
    status: Domain.TanwirSubmissionStatus;
    attemptsCount: number;
    isLate: boolean;
    student: {
        code: string;
        user: {
            name: string;
        };
    };
}[];
export async function listTaskResults(taskId: string): Promise<ListTaskResultsResult> { return apiCollection<(ListTaskResultsResult)[number]>(`tanwir/tasks/${encodeURIComponent(taskId)}/results`); }
export function statusCounts(states: {
    state: string;
}[]) {
    const count = (state: string) => states.filter((item) => item.state === state).length;
    return { todo: count("todo"), pending: count("pending"), rejected: count("rejected"), approved: count("approved"), locked: count("locked") };
}
export type { SubmissionStatus } from "./policy";
