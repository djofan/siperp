import { apiRequest } from "@/lib/api";
import type * as Domain from "@/contracts/modules/tanwir";
export type AdminSummaryResult = {
    guru: number;
    peserta: number;
    groups: number;
    tasks: number;
    pending: number;
    students: number;
};
export async function adminSummary(): Promise<AdminSummaryResult> { return apiRequest<AdminSummaryResult>("tanwir/dashboard/admin"); }
export type MapPointsResult = {
    name: string;
    role: Domain.TanwirRole;
    place: string;
    lat: number;
    lng: number;
}[];
export async function mapPoints(): Promise<MapPointsResult> { return apiRequest<MapPointsResult>("tanwir/dashboard/map"); }
export type RecentMembersResult = {
    id: string;
    code: string;
    role: Domain.TanwirRole;
    createdAt: Date;
    user: {
        name: string;
    };
}[];
export async function recentMembers(limit = 6): Promise<RecentMembersResult> { return apiRequest<RecentMembersResult>(`tanwir/dashboard/recent?limit=${limit}`); }
export type TeacherSummaryResult = {
    pending: number;
    tasks: number;
    reviewed: number;
    groups: {
        id: string;
        code: string;
        name: string;
        members: {
            id: string;
            code: string;
            phone: string | null;
            teachingPlace: string | null;
            user: {
                name: string;
                isActive: boolean;
            };
            _count: {
                submissions: number;
                students: number;
            };
        }[];
    }[];
};
export async function teacherSummary(_teacherId: string): Promise<TeacherSummaryResult> { return apiRequest<TeacherSummaryResult>("tanwir/dashboard/teacher"); }
export type StudentGroupInfoResult = {
    code: string;
    _count: {
        members: number;
    };
    name: string;
    description: string | null;
    pic: {
        phone: string | null;
        user: {
            name: string;
        };
    } | null;
} | null;
export async function studentGroupInfo(_groupId: string | null): Promise<StudentGroupInfoResult> { return apiRequest<StudentGroupInfoResult>("tanwir/student/group"); }
