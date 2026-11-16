"use client";
import { useState } from "react";
import { ActionForm } from "../ActionForm";
import type { ActionState } from "../../api/actions";
type Contact = { name: string; phone: string };
export function AcademyContactsForm({ action, initial }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; initial: Contact[] }) {
  const [contacts, setContacts] = useState(initial);
  const edit = (index: number, key: keyof Contact, value: string) => setContacts(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  return <ActionForm action={action} label="Simpan kontak"><h2 className="font-semibold">Kontak CS / Admin</h2><p className="text-sm text-gray-500">Kontak pertama menjadi nomor utama. Semua kontak ditampilkan pada informasi pendaftaran.</p>
    {contacts.map((contact, index) => <div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"><label className="text-sm">Nama / peran<input name={'csContacts[' + index + '][name]'} required maxLength={100} value={contact.name} onChange={event => edit(index, 'name', event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="CS Ikhwan / Admin Akhwat" /></label><label className="text-sm">Nomor WhatsApp<input name={'csContacts[' + index + '][phone]'} required maxLength={30} type="tel" value={contact.phone} onChange={event => edit(index, 'phone', event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="081234567890" /></label>{contacts.length > 1 && <button type="button" onClick={() => setContacts(rows => rows.filter((_, i) => i !== index))} className="min-h-11 text-left text-sm text-red-700">Hapus kontak</button>}</div>)}
    <button type="button" onClick={() => setContacts(rows => [...rows, { name: '', phone: '' }])} className="min-h-11 rounded-xl border px-4 text-sm font-semibold">Tambah nomor CS / Admin</button>
  </ActionForm>;
}
