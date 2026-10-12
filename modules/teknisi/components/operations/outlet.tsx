import type { TechnicianUser } from "@/modules/teknisi/api/access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { outletScope } from "@/modules/teknisi/api/access";
import { addOutlet } from "@/modules/teknisi/api/actions";
import { ActionForm } from "@/modules/teknisi/components/ActionForm";
import { Field } from "@/modules/teknisi/components/Fields";
export async function OutletView({ user }: { user: TechnicianUser }) {
  const outlets = await prisma.teknisiOutlet.findMany({ where: outletScope(user), include: { _count: { select: { technicians: true, tickets: true } } }, orderBy: { name: "asc" } });
  return <><PageHeader title="Outlet" description="Lokasi penerimaan perangkat dan layanan servis HP." /><div className="grid gap-6 xl:grid-cols-3"><div className="space-y-4 xl:col-span-2">{outlets.map(outlet => <Card key={outlet.id}><div className="flex justify-between gap-3"><CardTitle>{outlet.name}</CardTitle><span className="text-xs text-emerald-500">{outlet.isActive ? "Aktif" : "Nonaktif"}</span></div><p className="mt-3 text-sm text-foreground/60">{outlet.address}</p><p className="mt-2 text-sm">{outlet.phone}</p><div className="mt-5 flex gap-5 text-xs text-foreground/50"><span>{outlet._count.technicians} teknisi</span><span>{outlet._count.tickets} tiket tercatat</span></div></Card>)}{!outlets.length && <Card>Belum ada outlet. Tambahkan lokasi pertama untuk mulai menerima servis.</Card>}</div>{user.canManage && <Card className="h-fit"><CardTitle>Tambah outlet</CardTitle><ActionForm action={addOutlet} className="mt-5"><Field name="name" label="Nama outlet" /><Field name="address" label="Alamat" maxLength={1000} /><Field name="phone" label="Nomor telepon" type="tel" maxLength={30} /></ActionForm></Card>}</div></>;
}
