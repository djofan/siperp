import { apiRequest } from "@/lib/api";
import type { Response11 } from "@/modules/teknisi/api/contracts";
import { requireTechnicianOperator } from "../../../api/access";
import { AccountSettings } from "../../../components/AccountSettings";
import { PageHeader } from "@/components/ui/PageHeader";
export default async function Page() {
 const user=await requireTechnicianOperator();
 const [outlets,profile]=await Promise.all([apiRequest<Response11["outlet"][]>("teknisi/outlets"),apiRequest<Response11["profile"]>("teknisi/profile")]);
 return <><PageHeader title="Pengaturan akun" description="Perbarui profil, kontak, alamat, dan password Anda."/><AccountSettings key={JSON.stringify([user.name,profile])} name={user.name} phone={profile?.phone??""} address={profile?.address??""} code={profile?.nip??""} outlet={outlets[0]?.name??"Belum ditempatkan"}/></>;
}
