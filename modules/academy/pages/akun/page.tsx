import { redirect } from "next/navigation";
import { getAcademyUser } from "../../api/access";
import { changeAcademyPassword, updateAcademyProfile } from "../../api/actions";
import { ActionForm } from "../../components/ActionForm";
import { PasswordField } from "../../components/ui/PasswordField";
import { inputClass, PageHeading } from "../../components/ui";
import { apiRequest } from "@/lib/api";
export default async function AccountPage() {
  const user = await getAcademyUser();
  if (!user) redirect("/academy/masuk");
  const profile = user.academyProfile ? await apiRequest<{ name: string; code: string | null; email: string | null; nis: string | null; phone: string | null; address: string | null; gender: "IKHWAN" | "AKHWAT" | null; cohortName: string | null }>("academy/profile") : null;
  const details = [["Angkatan", profile?.cohortName], ["Kelompok", profile?.gender === "IKHWAN" ? "Ikhwan" : profile?.gender === "AKHWAT" ? "Akhwat" : null], ["Nomor peserta", profile?.nis], ["Nomor akun", profile?.code], ["Email", profile?.email]];
  return <div className="mx-auto max-w-3xl p-4 md:p-6"><PageHeading title="Profil">Data peserta dan keamanan akun Anda.</PageHeading>
    <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6"><h2 className="font-semibold">Data peserta</h2><p className="mb-5 mt-2 text-sm text-gray-500">Data kepesertaan berikut dikelola oleh admin.</p><dl className="grid gap-5 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm leading-6">{value || "Belum diisi"}</dd></div>)}</dl></section>
    {profile && !user.academyProfile?.mustChangePassword && <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6"><h2 className="font-semibold">Edit profil</h2><p className="mb-5 mt-2 text-sm text-gray-500">Perbarui nama, nomor HP, dan alamat Anda. Nama juga digunakan pada akun SIP Anda.</p>
      <ActionForm action={updateAcademyProfile} label="Simpan profil">
        <div><label htmlFor="profile-name" className="text-sm font-medium">Nama lengkap</label><input id="profile-name" name="name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={profile.name} className={inputClass} /></div>
        <div><label htmlFor="profile-phone" className="text-sm font-medium">Nomor HP / WhatsApp</label><input id="profile-phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} defaultValue={profile.phone ?? ""} aria-describedby="profile-phone-hint" className={inputClass} /><p id="profile-phone-hint" className="mt-1 text-xs text-gray-500">Gunakan nomor Indonesia, diawali 08, 628, atau +628.</p></div>
        <div><label htmlFor="profile-address" className="text-sm font-medium">Alamat</label><textarea id="profile-address" name="address" autoComplete="street-address" required maxLength={2000} rows={3} defaultValue={profile.address ?? ""} className={inputClass} /></div>
      </ActionForm>
    </section>}
    <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6"><h2 className="font-semibold">Ubah password</h2><p className="mb-5 mt-2 text-sm text-gray-500">Password ini digunakan untuk akun SIP Anda di seluruh modul.</p>
    {user.academyProfile?.mustChangePassword && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm">Ganti password sementara sebelum memulai belajar.</p>}
    <ActionForm action={changeAcademyPassword} label="Ganti password"><div>{[["currentPassword", "Password saat ini", "current-password"], ["password", "Password baru (minimal 10 karakter)", "new-password"], ["confirmPassword", "Konfirmasi password baru", "new-password"]].map(([name,label,complete]) => <div key={name} className="mb-4"><label htmlFor={name} className="text-sm font-medium">{label}</label><PasswordField id={name} name={name} autoComplete={complete} required minLength={name === "currentPassword" ? undefined : 10} maxLength={72} className={inputClass} /></div>)}</div></ActionForm>
    </section>
  </div>;
}
