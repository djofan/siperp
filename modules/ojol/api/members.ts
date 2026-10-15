import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import type { OjolMemberRole } from "./access";
import type { QuestionInput } from "./tasks";
export interface AddressInput {
    address: string | null;
    provinceId: string | null;
    provinceName: string | null;
    cityId: string | null;
    cityName: string | null;
    districtId: string | null;
    districtName: string | null;
    villageId: string | null;
    villageName: string | null;
}
export type CreateMemberResult = {
    id: string;
    code: string;
};
export async function createMember(role: OjolMemberRole, form: FormData): Promise<CreateMemberResult> { form.set("role", role); return apiRequest<CreateMemberResult>("ojol/members", { method: "POST", body: form }); }
export type UpdateMemberResult = void;
export async function updateMember(memberId: string, role: OjolMemberRole, form: FormData): Promise<UpdateMemberResult> { form.set("role", role); await apiRequest(`ojol/members/${encodeURIComponent(memberId)}`, { method: "PUT", body: form }); }
export type SetMemberActiveResult = void;
export async function setMemberActive(memberId: string, isActive: boolean): Promise<SetMemberActiveResult> { await apiRequest(`ojol/members/${encodeURIComponent(memberId)}/status`, { method: "PUT", body: JSON.stringify({ isActive }) }); }
export type DeleteMemberResult = void;
export async function deleteMember(memberId: string, role: OjolMemberRole): Promise<DeleteMemberResult> { await apiRequest(`ojol/members/${encodeURIComponent(memberId)}`, { method: "DELETE" }); }
export type UpdateOwnProfileResult = void;
export async function updateOwnProfile(memberId: string, form: FormData): Promise<UpdateOwnProfileResult> { await apiRequest("ojol/profile", { method: "PUT", body: form }); }
export type ChangeOwnPasswordResult = void;
export async function changeOwnPassword(userId: string, form: FormData): Promise<ChangeOwnPasswordResult> { await apiRequest("ojol/profile/password", { method: "PUT", body: form }); }
export type ListMembersResult = {
    id: string;
    code: string;
    role: Domain.OjolRole;
    phone: string | null;
    gender: Domain.OjolGender | null;
    photo: string | null;
    provinceName: string | null;
    cityName: string | null;
    createdAt: Date;
    user: {
        name: string;
        email: string;
        isActive: boolean;
    };
    group: {
        id: string;
        code: string;
        name: string;
    } | null;
    _count: {
        tasks: number;
        submissions: number;
    };
}[];
export async function listMembers(role: OjolMemberRole, search = ""): Promise<ListMembersResult> { return apiCollection<(ListMembersResult)[number]>(`ojol/members?role=${role}&search=${encodeURIComponent(search)}`); }
export type GetMemberForEditResult = ({
    user: {
        name: string;
        email: string;
        isActive: boolean;
    };
} & {
    id: string;
    userId: string;
    code: string;
    role: Domain.OjolRole;
    phone: string | null;
    gender: Domain.OjolGender | null;
    photo: string | null;
    address: string | null;
    provinceId: string | null;
    provinceName: string | null;
    cityId: string | null;
    cityName: string | null;
    districtId: string | null;
    districtName: string | null;
    villageId: string | null;
    villageName: string | null;
    latitude: number | null;
    longitude: number | null;
    groupId: string | null;
    createdAt: Date;
    updatedAt: Date;
}) | null;
export async function getMemberForEdit(memberId: string, role: OjolMemberRole): Promise<GetMemberForEditResult> { try {
    return await apiRequest<GetMemberForEditResult>(`ojol/members/${encodeURIComponent(memberId)}?role=${role}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export async function getOwnProfile() { return apiRequest<NonNullable<Awaited<ReturnType<typeof getMemberForEdit>>> & { group: { name: string; code: string } | null }>("ojol/profile"); }
