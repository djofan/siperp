import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { peopleData } from "@/modules/teknisi/api/view-data";
import { registerTeknisiParticipant } from "@/modules/teknisi/api/participant-actions";
import { ActionForm } from "@/modules/teknisi/components/ActionForm";
import { Choice,Field } from "@/modules/teknisi/components/Fields";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
export default async function Page(){const user=await requireTechnicianAdminView();if(!user.canManage)notFound();const {outlets}=await peopleData();return <div className="tech-form-page"><Link href="/admin/teknisi/teknisi">← Akun teknisi</Link><h1 className="mt-4">Buat akun PTH</h1><p className="tech-note">Kode PTH dialokasikan Laravel. API saat ini membatasi satu teknisi aktif per outlet.</p><section className="tech-box">{outlets.length?<ActionForm action={registerTeknisiParticipant} submit="Buat akun teknisi"><div className="tech-form-grid"><ParticipantRegistrationFields/><Choice name="outletId" label="Outlet tanpa teknisi aktif" required><option value="">Pilih outlet</option>{outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Choice><Field name="specialty" label="Keahlian (opsional)" required={false}/></div></ActionForm>:<p>Belum ada outlet yang dapat ditugaskan. <Link href="/admin/teknisi/outlet/baru">Buat outlet →</Link></p>}</section></div>;}
