import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
import type { TechnicianUser } from "./access";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export async function createOutlet(user: TechnicianUser, form: FormData): Promise<{
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
} | {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
}> { return apiRequest<{
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
} | {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
}>("teknisi/outlets", { method: "POST", body: form }); }
export async function saveTechnician(user: TechnicianUser, form: FormData): Promise<{
    id: string;
    name: string;
    isActive: boolean;
    userId: string;
    outletId: string;
    specialty: string;
    activeOutletId: string | null;
}> { return apiRequest<{
    id: string;
    name: string;
    isActive: boolean;
    userId: string;
    outletId: string;
    specialty: string;
    activeOutletId: string | null;
}>("teknisi/technicians", { method: "POST", body: form }); }
export async function createTicket(user: TechnicianUser, form: FormData): Promise<{
    number: string;
    id: string;
    createdAt: Date;
    outletId: string;
    trackingToken: string;
    technicianId: string | null;
    participantId: string | null;
    customerName: string;
    customerPhone: string;
    device: string;
    imei: string | null;
    complaint: string;
    accessories: string | null;
    status: string;
    priority: string;
    estimate: number;
    serviceCost: number;
    dueAt: Date | null;
    updatedAt: Date;
} | {
    number: string;
    id: string;
    createdAt: Date;
    outletId: string;
    trackingToken: string;
    technicianId: string | null;
    participantId: string | null;
    customerName: string;
    customerPhone: string;
    device: string;
    imei: string | null;
    complaint: string;
    accessories: string | null;
    status: string;
    priority: string;
    estimate: number;
    serviceCost: number;
    dueAt: Date | null;
    updatedAt: Date;
}> { return apiRequest<{
    number: string;
    id: string;
    createdAt: Date;
    outletId: string;
    trackingToken: string;
    technicianId: string | null;
    participantId: string | null;
    customerName: string;
    customerPhone: string;
    device: string;
    imei: string | null;
    complaint: string;
    accessories: string | null;
    status: string;
    priority: string;
    estimate: number;
    serviceCost: number;
    dueAt: Date | null;
    updatedAt: Date;
} | {
    number: string;
    id: string;
    createdAt: Date;
    outletId: string;
    trackingToken: string;
    technicianId: string | null;
    participantId: string | null;
    customerName: string;
    customerPhone: string;
    device: string;
    imei: string | null;
    complaint: string;
    accessories: string | null;
    status: string;
    priority: string;
    estimate: number;
    serviceCost: number;
    dueAt: Date | null;
    updatedAt: Date;
}>("teknisi/tickets", { method: "POST", body: form }); }
export async function linkTicketParticipant(user: TechnicianUser, form: FormData): Promise<void> { return apiRequest<void>("teknisi/tickets/link", { method: "POST", body: form }); }
export async function updateTicket(user: TechnicianUser, form: FormData): Promise<void> { return apiRequest<void>("teknisi/tickets/update", { method: "POST", body: form }); }
export async function createPart(user: TechnicianUser, form: FormData): Promise<{
    id: string;
    name: string;
    outletId: string;
    sku: string;
    stock: number;
    minimum: number;
    price: number;
} | {
    id: string;
    name: string;
    outletId: string;
    sku: string;
    stock: number;
    minimum: number;
    price: number;
}> { return apiRequest<{
    id: string;
    name: string;
    outletId: string;
    sku: string;
    stock: number;
    minimum: number;
    price: number;
} | {
    id: string;
    name: string;
    outletId: string;
    sku: string;
    stock: number;
    minimum: number;
    price: number;
}>("teknisi/parts", { method: "POST", body: form }); }
export async function restockPart(user: TechnicianUser, form: FormData): Promise<void> { return apiRequest<void>("teknisi/parts/restock", { method: "POST", body: form }); }
export async function recordPartNeed(user: TechnicianUser, form: FormData): Promise<void> { return apiRequest<void>("teknisi/parts/need", { method: "POST", body: form }); }
export async function consumeSparepart(user: TechnicianUser, form: FormData): Promise<void> { return apiRequest<void>("teknisi/parts/consume", { method: "POST", body: form }); }
