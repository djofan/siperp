import { apiRequest, apiCollection, ApiError } from "@/lib/api";
export type CreateGroupResult = {
    id: string;
};
export async function createGroup(form: FormData): Promise<CreateGroupResult> { return apiRequest<CreateGroupResult>("tanwir/groups", { method: "POST", body: form }); }
export type UpdateGroupResult = void;
export async function updateGroup(groupId: string, form: FormData): Promise<UpdateGroupResult> { await apiRequest(`tanwir/groups/${encodeURIComponent(groupId)}`, { method: "PUT", body: form }); }
export type DeleteGroupResult = void;
export async function deleteGroup(groupId: string): Promise<DeleteGroupResult> { await apiRequest(`tanwir/groups/${encodeURIComponent(groupId)}`, { method: "DELETE" }); }
export type ListGroupsResult = {
    id: string;
    code: string;
    createdAt: Date;
    _count: {
        tasks: number;
        members: number;
    };
    name: string;
    description: string | null;
    pic: {
        id: string;
        code: string;
        user: {
            name: string;
        };
    } | null;
}[];
export async function listGroups(): Promise<ListGroupsResult> { return apiCollection<(ListGroupsResult)[number]>("tanwir/groups"); }
export type GetGroupDetailResult = {
    id: string;
    code: string;
    _count: {
        tasks: number;
    };
    name: string;
    description: string | null;
    picId: string | null;
    pic: {
        code: string;
        user: {
            name: string;
        };
    } | null;
    members: {
        id: string;
        code: string;
        phone: string | null;
        teachingPlace: string | null;
        user: {
            name: string;
            isActive: boolean;
        };
    }[];
} | null;
export async function getGroupDetail(groupId: string): Promise<GetGroupDetailResult> { try {
    return await apiRequest<GetGroupDetailResult>(`tanwir/groups/${encodeURIComponent(groupId)}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export type GroupOptionsResult = {
    id: string;
    code: string;
    name: string;
}[];
export async function groupOptions(): Promise<GroupOptionsResult> { return apiRequest<GroupOptionsResult>("tanwir/groups/options"); }
export type GuruOptionsResult = {
    id: string;
    code: string;
    user: {
        name: string;
    };
}[];
export async function guruOptions(): Promise<GuruOptionsResult> { return apiRequest<GuruOptionsResult>("tanwir/teachers/options"); }
