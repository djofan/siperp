// Stable data contracts only; no runtime module implementation imports.

export interface TeknisiParticipant {
  id: string;
  userId: string;
  nip: string;
  address: string;
  phone: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface TeknisiOutlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TeknisiTechnician {
  id: string;
  userId: string;
  name: string;
  outletId: string;
  specialty: string;
  isActive: boolean;
  activeOutletId: string | null;
}

export interface TeknisiTicket {
  id: string;
  number: string;
  trackingToken: string;
  outletId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface TeknisiEvent {
  id: string;
  ticketId: string;
  status: string;
  note: string;
  actorName: string;
  createdAt: Date;
}

export interface TeknisiPart {
  id: string;
  outletId: string;
  sku: string;
  name: string;
  stock: number;
  minimum: number;
  price: number;
}

export interface TeknisiPartUse {
  id: string;
  ticketId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
}

export interface TeknisiStockMovement {
  id: string;
  partId: string;
  quantity: number;
  note: string;
  actorName: string;
  createdAt: Date;
}
