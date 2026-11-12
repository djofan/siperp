import { redirect } from "next/navigation";
import { getAcademyUser } from "../../api/access";
import { changeAcademyPassword } from "../../api/actions";
import { ActionForm } from "../../components/ActionForm";
import { PasswordField } from "../../components/ui/PasswordField";
import { inputClass, PageHeading } from "../../components/ui";
import { apiRequest } from "@/lib/api";
export default async function AccountPage() {
  const user = await getAcademyUser();
  if (!user) redirect("/academy/masuk");
  const profile = user.academyProfile ? await apiRequest<{ name: string; code: string | null; email: string | null; nis: string | null; phone: string | null; address: string | null; gender: "IKHWAN" | "AKHWAT" | null }>("academy/profile") : null;
  const details = [["Nama lengkap", profile?.name ?? user.name], ["Nomor peserta", profile?.nis], ["Kode akun", profile?.code], ["Email", profile?.email], ["Nomor HP / WhatsApp", profile?.phone], ["Kelompok", profile?.gender === "IKHWAN" ? "Ikhwan" : profile?.gender === "AKHWAT" ? "Akhwat" : null], ["Alamat", profile?.address]];
  return <div className="mx-auto max-w-3xl p-4 md:p-6"><PageHeading title="Profil">Data peserta dan keamanan akun Anda.</PageHeading>
    <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6"><h2 className="mb-5 font-semibold">Data peserta</h2><dl className="grid gap-5 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className={label === "Alamat" ? "sm:col-span-2" : undefined}><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 break-words whitespace-pre-line text-sm leading-6">{value || "Belum diisi"}</dd></div>)}</dl></section>
    <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6"><h2 className="font-semibold">Ubah password</h2><p className="mb-5 mt-2 text-sm text-gray-500">Password ini digunakan untuk akun SIP Anda di seluruh modul.</p>
    {user.academyProfile?.mustChangePassword && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm">Ganti password sementara sebelum memulai belajar.</p>}
    <ActionForm action={changeAcademyPassword} label="Ganti password"><div>{[["currentPassword", "Password saat ini", "current-password"], ["password", "Password baru (minimal 10 karakter)", "new-password"], ["confirmPassword", "Konfirmasi password baru", "new-password"]].map(([name,label,complete]) => <div key={name} className="mb-4"><label htmlFor={name} className="text-sm font-medium">{label}</label><PasswordField id={name} name={name} autoComplete={complete} required minLength={name === "currentPassword" ? undefined : 10} maxLength={72} className={inputClass} /></div>)}</div></ActionForm>
    </section>
  </div>;
}
