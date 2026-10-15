import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import type { TechnicianUser } from "./access";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export async function getTeknisiParticipant(): Promise<{
    id: string;
    address: string;
    phone: string | null;
    user: {
        name: string;
    };
    nip: string;
} | null> { if (!await getSession())
    return null; try {
    return await apiRequest<{
        id: string;
        address: string;
        phone: string | null;
        user: {
            name: string;
        };
        nip: string;
    } | null>("teknisi/profile");
}
catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status))
        return null;
    throw error;
} }
export async function requireTeknisiParticipant() {
    const participant = await getTeknisiParticipant();
    if (!participant)
        redirect("/teknisi/masuk");
    return participant;
}
