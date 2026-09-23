import { prisma } from "@/lib/prisma";
import { BENEFICIARY_CATEGORIES } from "@/modules/sarsip/beneficiaryCategories";

export function parseBeneficiary(body: Record<string, unknown>) {
  const text = (key: string, required = false, limit = 191) => {
    const value = typeof body[key] === "string" ? body[key].trim() : "";
    if ((required && !value) || value.length > limit) throw new Error("Nama, lokasi, dan bantuan wajib diisi, maksimal 191 karakter. Catatan maksimal 5.000 karakter.");
    return value;
  };
  const name = text("name", true), location = text("location", true), assistance = text("assistance", true);
  const phone = text("phone");
  if (phone && !/^\+?[0-9 ()-]{6,25}$/.test(phone)) throw new Error("Nomor telepon tidak valid.");
  const date = typeof body.receivedAt === "string" ? body.receivedAt : "";
  const receivedAt = new Date(`${date}T00:00:00+07:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(receivedAt.getTime()) || receivedAt > new Date() || receivedAt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }) !== date) throw new Error("Tanggal bantuan harus valid dan tidak boleh di masa depan.");
  const publicName = text("publicName");
  const category = text("category") || "Lainnya";
  if (!BENEFICIARY_CATEGORIES.some((item) => item === category)) throw new Error("Kategori bantuan tidak valid.");
  const amount = Number(body.amount ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647) throw new Error("Nominal bantuan harus antara Rp0 dan Rp2.147.483.647.");
  const image = text("image");
  if (image && !/^\/uploads\/sarsip\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image)) throw new Error("Silakan unggah file gambar yang valid.");
  const isPublished = body.isPublished === true || body.isPublished === "on";
  if (isPublished && !publicName) throw new Error("Isi nama tampilan publik sebelum mempublikasikan.");
  return { name, location, assistance, phone: phone || null, notes: text("notes", false, 5000) || null, receivedAt, publicName: publicName || null, category, amount, image: image || null, isPublished };
}

export async function listPublicBeneficiaries() {
  return prisma.sarsipBeneficiary.findMany({
    where: { isPublished: true, archivedAt: null },
    select: { id: true, publicName: true, category: true, amount: true, image: true },
    orderBy: { receivedAt: "desc" },
  });
}

export async function getTransparency() {
  const where = { moduleSource: "sarsip", sourceType: "campaign", status: "paid" };
  const [funds, donors, beneficiaries] = await Promise.all([
    prisma.paymentTransaction.aggregate({ where, _sum: { amount: true } }),
    prisma.paymentTransaction.groupBy({ by: ["donorId"], where }),
    prisma.sarsipBeneficiary.count({ where: { archivedAt: null } }),
  ]);
  return { totalAmount: funds._sum.amount ?? 0, donorCount: donors.length, beneficiaryCount: beneficiaries };
}
