import { apiRequest } from "@/lib/api";
import type * as Domain from "@/contracts/modules/ojol";
export type AdminSummaryResult = {
    guru: number;
    peserta: number;
    groups: number;
    tasks: number;
    pending: number;
};
export async function adminSummary(): Promise<AdminSummaryResult> { return apiRequest<AdminSummaryResult>("ojol/dashboard/admin"); }
export type MapPointsResult = {
    name: string;
    role: Domain.OjolRole;
    place: string;
    lat: number;
    lng: number;
}[];
export async function mapPoints(): Promise<MapPointsResult> { return apiRequest<MapPointsResult>("ojol/dashboard/map"); }
export type RecentMembersResult = {
    id: string;
    code: string;
    role: Domain.OjolRole;
    createdAt: Date;
    user: {
        name: string;
    };
}[];
export async function recentMembers(limit = 6): Promise<RecentMembersResult> { return apiRequest<RecentMembersResult>(`ojol/dashboard/recent?limit=${limit}`); }
export type TeacherSummaryResult = {
    pending: number;
    tasks: number;
    reviewed: number;
    activeTasks: {
        id: string;
        _count: {
            submissions: number;
        };
        title: string;
        teacherId: string | null;
        type: Domain.OjolTaskType;
        deadline: Date;
        groups: {
            group: {
                _count: {
                    members: number;
                };
                name: string;
            };
        }[];
    }[];
};
export async function teacherSummary(_teacherId: string): Promise<TeacherSummaryResult> { return apiRequest<TeacherSummaryResult>("ojol/dashboard/teacher"); }
export type StudentGroupInfoResult = {
    code: string;
    _count: {
        members: number;
    };
    name: string;
    description: string | null;
} | null;
export async function studentGroupInfo(_groupId: string | null): Promise<StudentGroupInfoResult> { return apiRequest<StudentGroupInfoResult>("ojol/student/group"); }
