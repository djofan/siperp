import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/contracts/modules/academy";
export type ListAdminQuizzesResult = {
    items: {
        isPublished: boolean;
        id: string;
        title: string;
        _count: {
            questions: number;
            attempts: number;
        };
        isActive: boolean;
        chapter: {
            id: string;
            title: string;
            courseId: string;
            course: {
                title: string;
            };
        };
    }[] | {
        isPublished: boolean;
        id: string;
        title: string;
        _count: {
            questions: number;
            attempts: number;
        };
        isActive: boolean;
        chapter: {
            id: string;
            title: string;
            courseId: string;
            course: {
                title: string;
            };
        };
    }[];
    page: number;
    pages: number;
    total: number;
};
export async function listAdminQuizzes(search: string, requestedPage: number): Promise<ListAdminQuizzesResult> { return await apiRequest<ListAdminQuizzesResult>(`academy/admin/quizzes?search=${encodeURIComponent(search)}&page=${requestedPage}`); }
export type GetAdminQuizResult = {
    isPublished: boolean;
    id: string;
    title: string;
    description: string | null;
    _count: {
        attempts: number;
    };
    releaseDay: number;
    isActive: boolean;
    passingScore: number;
    quizDate: Date | null;
    timeLimitMinutes: number;
    allowRetake: boolean;
    kind: Domain.AcademyQuizKind;
    closesAt: Date | null;
    questions: {
        id: string;
        order: number;
        question: string;
        type: Domain.AcademyQuestionType;
        weight: number;
        explanation: string | null;
        options: {
            id: string;
            isCorrect: boolean;
            label: string;
        }[];
    }[];
    chapter: {
        title: string;
    };
} | {
    isPublished: boolean;
    id: string;
    title: string;
    description: string | null;
    _count: {
        attempts: number;
    };
    releaseDay: number;
    isActive: boolean;
    passingScore: number;
    quizDate: Date | null;
    timeLimitMinutes: number;
    allowRetake: boolean;
    kind: Domain.AcademyQuizKind;
    closesAt: Date | null;
    questions: {
        id: string;
        order: number;
        question: string;
        type: Domain.AcademyQuestionType;
        weight: number;
        explanation: string | null;
        options: {
            id: string;
            isCorrect: boolean;
            label: string;
        }[];
    }[];
    chapter: {
        title: string;
    };
} | null;
export async function getAdminQuiz(courseId: string, chapterId: string, quizId: string): Promise<GetAdminQuizResult> {
    try {
        return await apiRequest<{
            isPublished: boolean;
            id: string;
            title: string;
            description: string | null;
            _count: {
                attempts: number;
            };
            releaseDay: number;
            isActive: boolean;
            passingScore: number;
            quizDate: Date | null;
            timeLimitMinutes: number;
            allowRetake: boolean;
            kind: Domain.AcademyQuizKind;
            closesAt: Date | null;
            questions: {
                id: string;
                order: number;
                question: string;
                type: Domain.AcademyQuestionType;
                weight: number;
                explanation: string | null;
                options: {
                    id: string;
                    isCorrect: boolean;
                    label: string;
                }[];
            }[];
            chapter: {
                title: string;
            };
        } | {
            isPublished: boolean;
            id: string;
            title: string;
            description: string | null;
            _count: {
                attempts: number;
            };
            releaseDay: number;
            isActive: boolean;
            passingScore: number;
            quizDate: Date | null;
            timeLimitMinutes: number;
            allowRetake: boolean;
            kind: Domain.AcademyQuizKind;
            closesAt: Date | null;
            questions: {
                id: string;
                order: number;
                question: string;
                type: Domain.AcademyQuestionType;
                weight: number;
                explanation: string | null;
                options: {
                    id: string;
                    isCorrect: boolean;
                    label: string;
                }[];
            }[];
            chapter: {
                title: string;
            };
        } | null>(`academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes/${encodeURIComponent(quizId)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type SaveAdminQuizResult = {
    id: string;
};
export async function saveAdminQuiz(courseId: string, chapterId: string, id: string | null, form: FormData): Promise<SaveAdminQuizResult> { return await apiRequest<SaveAdminQuizResult>(id ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes/${encodeURIComponent(id)}` : `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes`, { method: id ? "PUT" : "POST", body: form }); }
export type SaveAdminQuestionResult = {
    id: string;
};
export async function saveAdminQuestion(courseId: string, chapterId: string, quizId: string, id: string | null, form: FormData): Promise<SaveAdminQuestionResult> { return await apiRequest<SaveAdminQuestionResult>(id ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(id)}` : `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes/${encodeURIComponent(quizId)}/questions`, { method: id ? "PUT" : "POST", body: form }); }
export type DeleteAdminQuestionResult = void;
export async function deleteAdminQuestion(courseId: string, chapterId: string, quizId: string, id: string): Promise<DeleteAdminQuestionResult> { await apiRequest<DeleteAdminQuestionResult>(`academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export type DeleteAdminQuizResult = void;
export async function deleteAdminQuiz(courseId: string, chapterId: string, quizId: string): Promise<DeleteAdminQuizResult> { await apiRequest<DeleteAdminQuizResult>(`academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/quizzes/${encodeURIComponent(quizId)}`, { method: "DELETE" }); }
