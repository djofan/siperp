"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "./access";
import { normalizeEmail, normalizePhone } from "./policy";
export type ErpActionState = { error?: string; message?: string };
export async function syncContacts(): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  const [donors, participants, beneficiaries, applicants, lazBeneficiaries] = await Promise.all([
    prisma.paymentDonor.findMany({ select: { id: true, name: true, phone: true, email: true } }),
    prisma.zakatAcademyProfile.findMany({ select: { id: true, phone: true, user: { select: { name: true, email: true, isSuperadmin: true, moduleAccess: { where: { module: { slug: "academy" } }, select: { role: true } } } } } }),
    prisma.sarsipBeneficiary.findMany({ where: { archivedAt: null }, select: { id: true, name: true, phone: true } }),
    prisma.lazsipProgramApplicant.findMany({ select: { id: true, name: true, contact: true } }),
    prisma.lazsipBeneficiary.findMany({ select: { id: true, name: true } }),
  ]);
  const records = [
    ...donors.map(d => ({ ...d, source: "payment", role: "Donatur" })),
    ...participants.map(p => ({ id: p.id, name: p.user.name, email: p.user.email, phone: p.phone, source: "academy", role: p.user.isSuperadmin ? "Superadmin Academy" : p.user.moduleAccess.some(a => ["teacher", "pengajar"].includes(a.role)) ? "Pengajar Academy" : "Peserta Academy" })),
    ...beneficiaries.map(b => ({ ...b, email: null, source: "sarsip", role: "Penerima bantuan" })),
    ...applicants.map(a => ({ id: a.id, name: a.name, phone: normalizePhone(a.contact), email: normalizeEmail(a.contact), source: "lazsip-pendaftar", role: "Pendaftar bantuan" })),
    ...lazBeneficiaries.map(b => ({ ...b, phone: null, email: null, source: "lazsip-penerima", role: "Penerima bantuan" })),
  ];
  try {
    await prisma.$transaction(async tx => {
      for (const record of records) {
        const phone = normalizePhone(record.phone), email = normalizeEmail(record.email);
        const existing = await tx.coreContactSource.findUnique({ where: { source_sourceId: { source: record.source, sourceId: record.id } } });
        let contactId = existing?.contactId;
        if (!contactId) {
          const candidates = phone || email ? await tx.coreContact.findMany({ where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] } }) : [];
          // Shared phone/email alone is insufficient proof of identity. Ambiguous records remain separate.
          const matches = candidates.filter(c => c.name.trim().toLowerCase() === record.name.trim().toLowerCase() && (!phone || !c.phone || phone === c.phone) && (!email || !c.email || email === c.email));
          const contact = matches.length === 1 ? matches[0] : await tx.coreContact.create({ data: { name: record.name, phone, email } });
          contactId = contact.id;
          if (matches.length === 1) await tx.coreContact.update({ where: { id: contactId }, data: { phone: contact.phone ?? phone, email: contact.email ?? email } });
        }
        await tx.coreContactSource.upsert({ where: { source_sourceId: { source: record.source, sourceId: record.id } }, create: { contactId, source: record.source, sourceId: record.id, role: record.role, name: record.name, phone, email }, update: { name: record.name, phone, email, syncedAt: new Date() } });
      }
      await tx.accessLog.create({ data: { message: `${actor.name} menyinkronkan ${records.length} sumber kontak ERP.` } });
    }, { timeout: 120000 });
  } catch { return { error: "Sinkronisasi gagal. Tidak ada perubahan parsial yang disimpan." }; }
  revalidatePath("/admin/super/kontak");
  return { message: `${records.length} sumber disinkronkan. Identitas yang meragukan tetap terpisah untuk diperiksa.` };
}
export async function saveContact(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  const id = String(form.get("id") ?? ""), name = String(form.get("name") ?? "").trim();
  const rawPhone = String(form.get("phone") ?? "").trim(), rawEmail = String(form.get("email") ?? "").trim();
  const phone = normalizePhone(rawPhone), email = normalizeEmail(rawEmail), notes = String(form.get("notes") ?? "").trim();
  if (name.length < 2 || name.length > 191 || rawPhone && !phone || rawEmail && !email || notes.length > 5000) return { error: "Periksa nama, nomor telepon, email, dan panjang catatan." };
  try { await prisma.$transaction(async tx => {
    if (id) await tx.coreContact.update({ where: { id }, data: { name, phone, email, notes } });
    else await tx.coreContact.create({ data: { name, phone, email, notes } });
    await tx.accessLog.create({ data: { message: `${actor.name} ${id ? "mengubah" : "membuat"} kontak ERP ${name}.` } });
  }); } catch { return { error: "Kontak gagal disimpan." }; }
  revalidatePath("/admin/super/kontak"); return { message: "Kontak disimpan. Data asli modul tetap tersedia pada sumber kontak." };
}
export async function mergeContacts(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  const target = String(form.get("target") ?? ""), source = String(form.get("source") ?? "");
  if (!target || !source || target === source || form.get("confirm") !== "yes") return { error: "Pilih dua kontak berbeda dan konfirmasi bahwa keduanya orang yang sama." };
  try { await prisma.$transaction(async tx => {
    const contacts = await tx.coreContact.findMany({ where: { id: { in: [target, source] } } });
    if (contacts.length !== 2) throw new Error();
    await tx.coreContactSource.updateMany({ where: { contactId: source }, data: { contactId: target } });
    const removed = contacts.find(c => c.id === source)!;
    const kept = contacts.find(c => c.id === target)!;
    await tx.coreContact.update({ where: { id: target }, data: { phone: kept.phone ?? removed.phone, email: kept.email ?? removed.email, notes: [kept.notes, `Digabung dari ${removed.name} (${source})`, removed.notes].filter(Boolean).join("\n") } });
    await tx.coreContact.delete({ where: { id: source } });
    await tx.accessLog.create({ data: { message: `${actor.name} menggabungkan kontak ${source} ke ${target}. Sumber modul dipertahankan.` } });
  }); } catch { return { error: "Penggabungan gagal. Muat ulang daftar kontak." }; }
  revalidatePath("/admin/super/kontak"); return { message: "Kontak digabung. Semua relasi sumber dipertahankan." };
}
