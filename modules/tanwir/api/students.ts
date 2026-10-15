import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import type { TanwirMemberRole } from "./access";
import type { QuestionInput } from "./tasks";
export type StudentScope = {
    kind: "peserta";
    memberId: string;
} | {
    kind: "guru";
    teacherId: string;
} | {
    kind: "admin";
};
export type SaveStudentResult = void;
export async function saveStudent(scope: StudentScope, studentId: string | null, form: FormData): Promise<SaveStudentResult> { await apiRequest(studentId ? `tanwir/students/${encodeURIComponent(studentId)}` : "tanwir/students", { method: studentId ? "PUT" : "POST", body: form }); }
export type DeleteStudentResult = void;
export async function deleteStudent(scope: StudentScope, studentId: string): Promise<DeleteStudentResult> { await apiRequest(`tanwir/students/${encodeURIComponent(studentId)}`, { method: "DELETE" }); }
export type ListStudentsResult = {
    id: string;
    updatedAt: Date;
    name: string;
    age: number | null;
    className: string | null;
    parentName: string | null;
    parentPhone: string | null;
    progress: string | null;
    member: {
        id: string;
        code: string;
        teachingPlace: string | null;
        user: {
            name: string;
        };
        group: {
            name: string;
        } | null;
    };
}[];
export async function listStudents(scope: StudentScope, search = ""): Promise<ListStudentsResult> { return apiCollection<(ListStudentsResult)[number]>(`tanwir/students?search=${encodeURIComponent(search)}`); }
export type GetStudentResult = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    memberId: string;
    age: number | null;
    className: string | null;
    parentName: string | null;
    parentPhone: string | null;
    progress: string | null;
} | null;
export async function getStudent(scope: StudentScope, studentId: string): Promise<GetStudentResult> { try {
    return await apiRequest<GetStudentResult>(`tanwir/students/${encodeURIComponent(studentId)}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export type OwnerOptionsResult = {
    id: string;
    code: string;
    user: {
        name: string;
    };
}[];
export async function ownerOptions(scope: StudentScope): Promise<OwnerOptionsResult> { return apiRequest<OwnerOptionsResult>("tanwir/students/owners"); }
