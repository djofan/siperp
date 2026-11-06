import "server-only";
import { apiRequest } from "@/lib/api";
import type { TechnicianUser } from "./access";
import type { WorkflowTicket } from "./workflow";
export async function listTickets(user: TechnicianUser, filters: {q?:string;status?:string;outlet?:string;page?:string}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) search.set(key, value);
  return apiRequest<{tickets: WorkflowTicket[]; total:number; page:number; outlets:{id:string;name:string}[]}>(`teknisi/tickets?${search}`);
}
export async function monitoring(user: TechnicianUser, outlet?: string): Promise<{
    grouped: ({status:string} & {
        _count: {
            _all: number;
        };
    })[];
    overdue: ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
        technician: {
            id: string;
            name: string;
            isActive: boolean;
            userId: string;
            outletId: string;
            specialty: string;
            activeOutletId: string | null;
        } | null;
    } & {
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
    })[] | ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
        technician: {
            id: string;
            name: string;
            isActive: boolean;
            userId: string;
            outletId: string;
            specialty: string;
            activeOutletId: string | null;
        } | null;
    } & {
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
    })[];
    recent: ({
        ticket: {
            number: string;
            id: string;
            device: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: string;
        note: string;
        actorName: string;
        ticketId: string;
    })[] | ({
        ticket: {
            number: string;
            id: string;
            device: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: string;
        note: string;
        actorName: string;
        ticketId: string;
    })[];
    outlets: ({
        tickets: {
            status: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[] | ({
        tickets: {
            status: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[];
    lowStock: ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
    } & {
        id: string;
        name: string;
        outletId: string;
        sku: string;
        stock: number;
        minimum: number;
        price: number;
    })[];
    technicians: ({
        tickets: {
            id: string;
        }[];
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    })[] | ({
        tickets: {
            id: string;
        }[];
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    })[];
}> { return apiRequest<{
    grouped: ({status:string} & {
        _count: {
            _all: number;
        };
    })[];
    overdue: ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
        technician: {
            id: string;
            name: string;
            isActive: boolean;
            userId: string;
            outletId: string;
            specialty: string;
            activeOutletId: string | null;
        } | null;
    } & {
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
    })[] | ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
        technician: {
            id: string;
            name: string;
            isActive: boolean;
            userId: string;
            outletId: string;
            specialty: string;
            activeOutletId: string | null;
        } | null;
    } & {
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
    })[];
    recent: ({
        ticket: {
            number: string;
            id: string;
            device: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: string;
        note: string;
        actorName: string;
        ticketId: string;
    })[] | ({
        ticket: {
            number: string;
            id: string;
            device: string;
        };
    } & {
        id: string;
        createdAt: Date;
        status: string;
        note: string;
        actorName: string;
        ticketId: string;
    })[];
    outlets: ({
        tickets: {
            status: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[] | ({
        tickets: {
            status: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[];
    lowStock: ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
    } & {
        id: string;
        name: string;
        outletId: string;
        sku: string;
        stock: number;
        minimum: number;
        price: number;
    })[];
    technicians: ({
        tickets: {
            id: string;
        }[];
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    })[] | ({
        tickets: {
            id: string;
        }[];
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    })[];
}>(`teknisi/monitoring?outlet=${encodeURIComponent(outlet ?? "")}`); }
export const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const dateTime = (value: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value);
