import type { QuizOption } from "./policy";
import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type * as Domain from "@/contracts/modules/ojol";
export interface QuestionInput {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string | null;
    optionD: string | null;
    correctOption: QuizOption;
}
export type CreateTaskResult = {
    id: string;
};
export async function createTask(teacherId: string, form: FormData): Promise<CreateTaskResult> { return apiRequest<CreateTaskResult>("ojol/tasks", { method: "POST", body: form }); }
export type UpdateTaskResult = void;
export async function updateTask(taskId: string, teacherId: string, form: FormData): Promise<UpdateTaskResult> { await apiRequest(`ojol/tasks/${encodeURIComponent(taskId)}`, { method: "PUT", body: form }); }
export type DeleteTaskResult = void;
export async function deleteTask(taskId: string, _teacherId: string | null): Promise<DeleteTaskResult> { await apiRequest(`ojol/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }); }
export type ExtendTaskResult = void;
export async function extendTask(taskId: string, teacherId: string, hours: number): Promise<ExtendTaskResult> { await apiRequest(`ojol/tasks/${encodeURIComponent(taskId)}/extensions`, { method: "POST", body: JSON.stringify({ hours }) }); }
export type ListTeacherTasksResult = {
    id: string;
    createdAt: Date;
    submissions: {
        id: string;
    }[];
    _count: {
        submissions: number;
        questions: number;
    };
    title: string;
    teacher: {
        user: {
            name: string;
        };
    } | null;
    teacherId: string | null;
    type: Domain.OjolTaskType;
    deadline: Date;
    originalDeadline: Date;
    groups: {
        group: {
            name: string;
        };
    }[];
}[];
export async function listTeacherTasks(_teacherId: string): Promise<ListTeacherTasksResult> { return apiCollection<(ListTeacherTasksResult)[number]>("ojol/tasks"); }
export type GetTeacherTaskResult = {
    canManage: boolean;
    _count: {
        submissions: number;
    };
    teacher: {
        user: {
            name: string;
        };
    } | null;
    groups: {
        group: {
            id: string;
            _count: {
                members: number;
            };
            name: string;
        };
    }[];
    questions: {
        id: string;
        createdAt: Date;
        order: number;
        taskId: string;
        question: string;
        optionA: string;
        optionB: string;
        optionC: string | null;
        optionD: string | null;
        correctOption: string;
    }[];
    approvers: {
        teacher: {
            code: string;
            user: {
                name: string;
            };
        };
        teacherId: string;
    }[];
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    title: string;
    teacherId: string | null;
    type: Domain.OjolTaskType;
    deadline: Date;
    originalDeadline: Date;
} | null;
export async function getTeacherTask(taskId: string, _teacherId: string): Promise<GetTeacherTaskResult> { try {
    return await apiRequest<GetTeacherTaskResult>(`ojol/tasks/${encodeURIComponent(taskId)}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export type ListAllTasksResult = {
    id: string;
    createdAt: Date;
    submissions: {
        id: string;
    }[];
    _count: {
        submissions: number;
    };
    title: string;
    teacher: {
        code: string;
        phone: string | null;
        user: {
            name: string;
        };
    } | null;
    type: Domain.OjolTaskType;
    deadline: Date;
}[];
export async function listAllTasks(): Promise<ListAllTasksResult> { return apiCollection<(ListAllTasksResult)[number]>("ojol/admin/tasks"); }
