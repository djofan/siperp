export type Response1 = {
    ticket: ({
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
        events: {
            id: string;
            createdAt: Date;
            status: string;
            note: string;
            actorName: string;
            ticketId: string;
        }[];
        partUses: ({
            part: {
                id: string;
                name: string;
                outletId: string;
                sku: string;
                stock: number;
                minimum: number;
                price: number;
            };
        } & {
            id: string;
            createdAt: Date;
            partId: string;
            quantity: number;
            ticketId: string;
            unitPrice: number;
        })[];
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
    }) | ({
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
        events: {
            id: string;
            createdAt: Date;
            status: string;
            note: string;
            actorName: string;
            ticketId: string;
        }[];
        partUses: ({
            part: {
                id: string;
                name: string;
                outletId: string;
                sku: string;
                stock: number;
                minimum: number;
                price: number;
            };
        } & {
            id: string;
            createdAt: Date;
            partId: string;
            quantity: number;
            ticketId: string;
            unitPrice: number;
        })[];
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
    }) | null;
    parts: {
        id: string;
        name: string;
        outletId: string;
        sku: string;
        stock: number;
        minimum: number;
        price: number;
    }[] | {
        id: string;
        name: string;
        outletId: string;
        sku: string;
        stock: number;
        minimum: number;
        price: number;
    }[];
    technicians: {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    }[] | {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    }[];
};
export type Response2 = {
    outlets: {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    }[] | {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    }[];
    technicians: ({
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
};
export type Response3 = {
    outlets: ({
        _count: {
            technicians: number;
            tickets: number;
        };
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[] | ({
        _count: {
            technicians: number;
            tickets: number;
        };
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[];
};
export type Response4 = {
    parts: ({
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
    })[] | ({
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
    outlets: {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    }[] | {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    }[];
    movements: ({
        part: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        partId: string;
        quantity: number;
        note: string;
        actorName: string;
    })[] | ({
        part: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        partId: string;
        quantity: number;
        note: string;
        actorName: string;
    })[];
};
export type Response5 = {
    people: ({
        user: {
            name: string;
            isActive: boolean;
        };
    } & {
        id: string;
        address: string;
        phone: string | null;
        createdAt: Date;
        userId: string;
        deletedAt: Date | null;
        nip: string;
    })[] | ({
        user: {
            name: string;
            isActive: boolean;
        };
    } & {
        id: string;
        address: string;
        phone: string | null;
        createdAt: Date;
        userId: string;
        deletedAt: Date | null;
        nip: string;
    })[];
    total: number;
    technicians: ({
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
        _count: {
            tickets: number;
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
        outlet: {
            id: string;
            name: string;
            address: string;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        };
        _count: {
            tickets: number;
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
    outlets: {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    }[] | never[];
};
export type Response6 = {
    person: ({
        user: {
            name: string;
        };
    } & {
        id: string;
        address: string;
        phone: string | null;
        createdAt: Date;
        userId: string;
        deletedAt: Date | null;
        nip: string;
    }) | ({
        user: {
            name: string;
        };
    } & {
        id: string;
        address: string;
        phone: string | null;
        createdAt: Date;
        userId: string;
        deletedAt: Date | null;
        nip: string;
    }) | null;
    technician: {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    } | {
        id: string;
        name: string;
        isActive: boolean;
        userId: string;
        outletId: string;
        specialty: string;
        activeOutletId: string | null;
    } | null;
    outlets: ({
        technicians: {
            userId: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[] | ({
        technicians: {
            userId: string;
        }[];
    } & {
        id: string;
        name: string;
        address: string;
        phone: string;
        isActive: boolean;
        createdAt: Date;
    })[];
};
export type Response7 = {
    outlets: {
        id: string;
        name: string;
        address: string;
        phone: string;
        technicians: { id: string; name: string; specialty: string | null }[];
    }[];
};
export type Response8 = {
    ticket: {
        number: string;
        createdAt: Date;
        status: string;
        dueAt: Date | null;
        updatedAt: Date;
        outlet: {
            name: string;
            phone: string;
        };
        events: {
            createdAt: Date;
            status: string;
        }[];
    } | null;
};
export type Response9 = {
    tickets: {
        number: string;
        id: string;
        createdAt: Date;
        device: string;
        status: string;
        estimate: number;
        serviceCost: number;
        dueAt: Date | null;
        outlet: {
            name: string;
            phone: string;
        };
        events: {
            createdAt: Date;
            status: string;
        }[];
        partUses: {
            quantity: number;
            unitPrice: number;
        }[];
    }[] | {
        number: string;
        id: string;
        createdAt: Date;
        device: string;
        status: string;
        estimate: number;
        serviceCost: number;
        dueAt: Date | null;
        outlet: {
            name: string;
            phone: string;
        };
        events: {
            createdAt: Date;
            status: string;
        }[];
        partUses: {
            quantity: number;
            unitPrice: number;
        }[];
    }[];
};
export type Response10 = {
    outlet: {
        name: string;
    } | {
        name: string;
    };
    profile: {
        nip: string;
    } | {
        nip: string;
    } | null;
};
export type Response11 = {
    outlet: {
        name: string;
    } | {
        name: string;
    };
    profile: {
        address: string;
        phone: string | null;
        nip: string;
    } | {
        address: string;
        phone: string | null;
        nip: string;
    } | null;
};
