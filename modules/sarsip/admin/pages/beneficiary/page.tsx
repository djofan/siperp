import { redirect } from "next/navigation";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BeneficiaryManager } from "@/modules/sarsip/components/admin/BeneficiaryManager";
export default async function BeneficiariesPage() {
  if (!hasModuleAccess(await getSession(), "sarsip")) redirect("/admin?error=forbidden");
  const rows = await prisma.sarsipBeneficiary.findMany({ where: { archivedAt: null }, orderBy: { createdAt: "desc" } });
  return <div><h1 className="text-2xl font-bold text-foreground">Penerima manfaat SARSIP</h1><p className="mb-6 mt-2 text-sm text-foreground/60">Catat satu orang satu kali; perbarui catatan untuk bantuan berikutnya. Data internal hanya terlihat oleh admin. Atur nama tampilan dan publikasi untuk menampilkan kartu penerima manfaat.</p><BeneficiaryManager rows={rows.map((row) => ({ id: row.id, publicName: row.publicName, category: row.category, amount: row.amount, image: row.image, isPublished: row.isPublished, name: row.name, phone: row.phone, location: row.location, assistance: row.assistance, notes: row.notes, receivedAt: row.receivedAt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }) }))}/></div>;
}
