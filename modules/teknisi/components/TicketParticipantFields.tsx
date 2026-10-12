"use client";
import { useState } from "react";
import { FormField, Input, Select } from "@/components/ui/FormField";
export function TicketParticipantFields({ participants }: { participants: { id: string; nip: string; name: string; phone: string }[] }) {
  const [participantId, setParticipantId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return <><FormField label="Akun peserta (opsional)" htmlFor="ticket-participant"><Select id="ticket-participant" name="participantId" value={participantId} onChange={event => { setParticipantId(event.target.value); const person = participants.find(item => item.id === event.target.value); if (person) { setName(person.name); setPhone(person.phone); } }}><option value="">Pelanggan tanpa akun</option>{participants.map(person => <option key={person.id} value={person.id}>{person.name} · {person.nip}</option>)}</Select></FormField><FormField label="Nama pelanggan" htmlFor="ticket-customer"><Input id="ticket-customer" name="customerName" value={name} onChange={event => setName(event.target.value)} readOnly={!!participantId} required maxLength={191} /></FormField><FormField label="Nomor WhatsApp / telepon" htmlFor="ticket-phone"><Input id="ticket-phone" name="customerPhone" type="tel" value={phone} onChange={event => setPhone(event.target.value)} readOnly={!!participantId} required maxLength={30} /></FormField></>;
}
