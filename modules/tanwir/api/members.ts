import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import type { TanwirMemberRole } from "./access";
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
export async function createMember(role: TanwirMemberRole, form: FormData): Promise<CreateMemberResult> { form.set("role", role); return apiRequest<CreateMemberResult>("tanwir/members", { method: "POST", body: form }); }
export type UpdateMemberResult = void;
export async function updateMember(memberId: string, role: TanwirMemberRole, form: FormData): Promise<UpdateMemberResult> { form.set("role", role); await apiRequest(`tanwir/members/${encodeURIComponent(memberId)}`, { method: "PUT", body: form }); }
export type SetMemberActiveResult = void;
export async function setMemberActive(memberId: string, isActive: boolean): Promise<SetMemberActiveResult> { await apiRequest(`tanwir/members/${encodeURIComponent(memberId)}/status`, { method: "PUT", body: JSON.stringify({ isActive }) }); }
export type DeleteMemberResult = void;
export async function deleteMember(memberId: string, _role: TanwirMemberRole): Promise<DeleteMemberResult> { await apiRequest(`tanwir/members/${encodeURIComponent(memberId)}`, { method: "DELETE" }); }
export type UpdateOwnProfileResult = void;
export async function updateOwnProfile(memberId: string, form: FormData): Promise<UpdateOwnProfileResult> { await apiRequest("tanwir/profile", { method: "PUT", body: form }); }
export type ChangeOwnPasswordResult = void;
export async function changeOwnPassword(userId: string, form: FormData): Promise<ChangeOwnPasswordResult> { await apiRequest("tanwir/profile/password", { method: "PUT", body: form }); }
export type ListMembersResult = {
    id: string;
    code: string;
    role: Domain.TanwirRole;
    phone: string | null;
    gender: Domain.TanwirGender | null;
    photo: string | null;
    teachingPlace: string | null;
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
    picGroups: {
        id: string;
        name: string;
    }[];
    _count: {
        tasks: number;
        submissions: number;
    };
}[];
export async function listMembers(role: TanwirMemberRole, search = ""): Promise<ListMembersResult> { return apiCollection<(ListMembersResult)[number]>(`tanwir/members?role=${role}&search=${encodeURIComponent(search)}`); }
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
    role: Domain.TanwirRole;
    phone: string | null;
    gender: Domain.TanwirGender | null;
    photo: string | null;
    teachingPlace: string | null;
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
export async function getMemberForEdit(memberId: string, role: TanwirMemberRole): Promise<GetMemberForEditResult> { try {
    return await apiRequest<GetMemberForEditResult>(`tanwir/members/${encodeURIComponent(memberId)}?role=${role}`);
}
catch (error) {
    if (error instanceof ApiError && error.status === 404)
        return null;
    throw error;
} }
export async function getOwnProfile() { return apiRequest<NonNullable<Awaited<ReturnType<typeof getMemberForEdit>>> & { group: { name: string; code: string } | null }>("tanwir/profile"); }
