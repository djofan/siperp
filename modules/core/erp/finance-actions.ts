"use server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "./access";
import { bankDate, canMatchBank, parseBankCsv, positiveRupiah } from "./policy";
import type { ErpActionState } from "./contact-actions";
export async function createExpense(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  try {
    const accountId = String(form.get("accountId") ?? ""), reference = String(form.get("reference") ?? "").trim(), description = String(form.get("description") ?? "").trim();
    const amount = positiveRupiah(form.get("amount")), spentAt = bankDate(String(form.get("spentAt") ?? ""));
    if (!reference || reference.length > 191 || description.length < 3 || description.length > 2000) throw new Error("Isi referensi unik dan keterangan pengeluaran.");
    const account = await prisma.paymentDestinationAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Rekening tidak ditemukan.");
    await prisma.$transaction(async tx => {
      await tx.coreExpense.create({ data: { accountId, reference, description, amount, spentAt, moduleSource: account.moduleSource, fundType: account.fundType, createdBy: actor.id } });
      await tx.accessLog.create({ data: { message: `${actor.name} mencatat pengeluaran ${reference} sebesar Rp${amount} (${account.moduleSource}/${account.fundType}).` } });
    });
  } catch (e) { return { error: e instanceof Error && !('code' in e) ? e.message : "Pengeluaran gagal disimpan. Pastikan referensinya belum digunakan." }; }
  revalidatePath("/admin/super/keuangan"); return { message: "Pengeluaran disimpan. Cocokkan dengan mutasi bank pada rekonsiliasi." };
}
export async function importBankLines(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  try {
    const accountId = String(form.get("accountId") ?? "");
    if (!await prisma.paymentDestinationAccount.findUnique({ where: { id: accountId } })) throw new Error("Pilih rekening tujuan.");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 1024 * 1024) throw new Error("Pilih CSV maksimal 1 MB.");
    const rows = parseBankCsv(await file.text());
    const data = rows.map(row => ({ ...row, accountId, fingerprint: createHash("sha256").update(JSON.stringify([accountId, row.bookedAt.toISOString(), row.reference, row.direction, row.amount])).digest("hex") }));
    const count = await prisma.$transaction(async tx => {
      const result = await tx.coreBankLine.createMany({ data, skipDuplicates: true });
      await tx.accessLog.create({ data: { message: `${actor.name} mengimpor ${result.count} mutasi bank untuk rekening ${accountId}.` } });
      return result.count;
    });
    revalidatePath("/admin/super/keuangan"); return { message: `${count} mutasi baru diimpor; ${rows.length-count} baris duplikat dilewati. Periksa lalu cocokkan transaksi.` };
  } catch (e) { return { error: e instanceof Error && !('code' in e) ? e.message : "CSV gagal diimpor." }; }
}
export async function matchBankLine(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  const id = String(form.get("lineId") ?? ""), entryId = String(form.get("entryId") ?? ""), note = String(form.get("note") ?? "").trim();
  if (!entryId || note.length < 3 || note.length > 2000) return { error: "Pilih transaksi dan tulis catatan verifikasi." };
  try { await prisma.$transaction(async tx => {
    const line = await tx.coreBankLine.findUnique({ where: { id } });
    if (!line || line.paymentId || line.expenseId) throw new Error("Mutasi sudah dicocokkan atau tidak ditemukan.");
    if (line.direction === "masuk") {
      const payment = await tx.paymentTransaction.findUnique({ where: { id: entryId } });
      if (!payment || payment.status !== "paid" || ["simulation", "midtrans_sandbox"].includes(payment.gateway) || !canMatchBank(line, { accountId: payment.destinationAccountId, amount: payment.amount + payment.adminFee, direction: "masuk" })) throw new Error("Rekening, nominal (termasuk biaya admin), dan status lunas harus cocok. Transaksi simulasi tidak dapat direkonsiliasi.");
      const result = await tx.coreBankLine.updateMany({ where: { id, paymentId: null, expenseId: null }, data: { paymentId: payment.id, matchedBy: actor.id, matchedAt: new Date(), matchNote: note } });
      if (result.count !== 1) throw new Error("Mutasi baru saja dicocokkan oleh pengguna lain.");
    } else {
      const expense = await tx.coreExpense.findUnique({ where: { id: entryId } });
      if (!expense || !canMatchBank(line, { accountId: expense.accountId, amount: expense.amount, direction: "keluar" })) throw new Error("Rekening dan nominal pengeluaran harus cocok.");
      const result = await tx.coreBankLine.updateMany({ where: { id, paymentId: null, expenseId: null }, data: { expenseId: expense.id, matchedBy: actor.id, matchedAt: new Date(), matchNote: note } });
      if (result.count !== 1) throw new Error("Mutasi baru saja dicocokkan oleh pengguna lain.");
    }
    await tx.accessLog.create({ data: { message: `${actor.name} mencocokkan mutasi ${line.reference} dengan ${entryId}.` } });
  }); } catch (e) { return { error: e instanceof Error && !('code' in e) ? e.message : "Transaksi sudah digunakan pada mutasi lain. Muat ulang daftar." }; }
  revalidatePath("/admin/super/keuangan"); return { message: "Mutasi berhasil dicocokkan." };
}
export async function unmatchBankLine(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  const id = String(form.get("lineId") ?? ""), note = String(form.get("note") ?? "").trim();
  if (note.length < 3 || note.length > 2000) return { error: "Isi alasan pembatalan pencocokan." };
  try { await prisma.$transaction(async tx => {
    const line = await tx.coreBankLine.findUnique({ where: { id } });
    if (!line || !line.paymentId && !line.expenseId) throw new Error();
    const result = await tx.coreBankLine.updateMany({ where: { id, paymentId: line.paymentId, expenseId: line.expenseId, matchedAt: line.matchedAt }, data: { paymentId: null, expenseId: null, matchNote: `Pembatalan: ${note}`, matchedBy: null, matchedAt: null } });
    if (result.count !== 1) throw new Error();
    await tx.accessLog.create({ data: { message: `${actor.name} membatalkan rekonsiliasi ${line.reference}: ${note}` } });
  }); } catch { return { error: "Pembatalan gagal. Muat ulang daftar." }; }
  revalidatePath("/admin/super/keuangan"); return { message: "Pencocokan dibatalkan; transaksi tersedia untuk dicocokkan kembali." };
}
