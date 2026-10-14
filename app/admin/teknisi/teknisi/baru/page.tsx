import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTechnicianAdminView } from "@/modules/teknisi/api/access";
import { registerTeknisiParticipant } from "@/modules/teknisi/api/participant-actions";
import { ActionForm } from "@/modules/teknisi/components/ActionForm";
import { Choice,Field } from "@/modules/teknisi/components/Fields";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
export default async function Page(){const user=await requireTechnicianAdminView();if(!user.canManage)notFound();const outlets=await prisma.teknisiOutlet.findMany({where:{isActive:true,technicians:{none:{isActive:true}}}});return <div className="tech-form-page"><Link href="/admin/teknisi/teknisi">← Akun teknisi</Link><h1 className="mt-4">Buat akun PTH</h1><p className="tech-note">Kode dibuat otomatis. Berikan kode dan password awal kepada teknisi outlet.</p><div className="tech-box">{outlets.length?<ActionForm action={registerTeknisiParticipant} submit="Buat akun teknisi"><div className="tech-form-grid"><ParticipantRegistrationFields/><Choice name="outletId" label="Outlet" required><option value="">Pilih outlet kosong</option>{outlets.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Choice><Field name="specialty" label="Keahlian (opsional)" required={false}/></div></ActionForm>:<p>Belum ada outlet kosong. <Link href="/admin/teknisi/outlet/baru">Tambahkan outlet dulu →</Link></p>}</div></div>;}
