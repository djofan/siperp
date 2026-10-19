import type { TechnicianUser } from "@/modules/teknisi/api/access";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";
import type { Response2 } from "@/modules/teknisi/api/contracts";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { addTicket } from "@/modules/teknisi/api/actions";
import { ActionForm } from "@/modules/teknisi/components/ActionForm";
import { Field, Choice } from "@/modules/teknisi/components/Fields";
export async function NewTicketView({ user, rootHref }: {
    user: TechnicianUser;
    rootHref: string;
}) {
    if (!user.canWrite)
        redirect(`${rootHref}/tiket`);
    const { outlets, technicians } = await apiRequest<Response2>("teknisi/new-ticket");
    return <><PageHeader title="Terima Servis Baru" description="Catat perangkat, keluhan, dan target pengerjaan pelanggan."/><Card>{!outlets.length ? <p>Tambahkan outlet terlebih dahulu melalui menu Outlet.</p> : <ActionForm action={addTicket} submit="Buat Tiket Servis"><div className="grid gap-5 md:grid-cols-2"><Choice name="outletId" label="Outlet penerimaan" required><option value="">Pilih outlet</option>{outlets.map(outlet => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</Choice><Choice name="technicianId" label="Teknisi"><option value="">{user.role === "technician" ? user.name : "Tugaskan nanti"}</option>{technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name} · {tech.outlet.name}</option>)}</Choice><Field name="customerName" label="Nama pelanggan"/><Field name="customerPhone" label="Nomor HP pelanggan" type="tel" maxLength={30}/><Field name="device" label="Merek dan tipe HP"/><Field name="imei" label="IMEI / nomor seri (opsional)" required={false} maxLength={30}/><Field name="complaint" label="Keluhan perangkat" maxLength={3000}/><Field name="accessories" label="Kondisi fisik dan kelengkapan (opsional)" required={false} maxLength={1000}/><Choice name="priority" label="Prioritas" value="normal"><option value="normal">Normal</option><option value="urgent">Mendesak</option></Choice><Field name="dueAt" label="Target selesai (opsional)" type="date" required={false}/><Field name="estimate" label="Estimasi biaya (Rp)" type="number" min={0} value={0}/></div></ActionForm>}</Card></>;
}
