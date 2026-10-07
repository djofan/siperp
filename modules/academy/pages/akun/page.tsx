import { redirect } from "next/navigation";
import { getAcademyUser } from "../../api/access";
import { changeAcademyPassword } from "../../api/actions";
import { ActionForm } from "../../components/ActionForm";
import { PasswordField } from "../../components/ui/PasswordField";
import { inputClass, PageHeading } from "../../components/ui";
export default async function AccountPage() {
  const user = await getAcademyUser();
  if (!user) redirect("/academy/masuk");
  return <div className="mx-auto max-w-xl p-6"><PageHeading title="Akun & password">Password ini digunakan untuk akun SIP Anda di seluruh modul.</PageHeading>
    {user.academyProfile?.mustChangePassword && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm">Ganti password sementara sebelum memulai belajar.</p>}
    <ActionForm action={changeAcademyPassword} label="Ganti password"><div>{[["currentPassword", "Password saat ini", "current-password"], ["password", "Password baru (minimal 10 karakter)", "new-password"], ["confirmPassword", "Konfirmasi password baru", "new-password"]].map(([name,label,complete]) => <div key={name} className="mb-4"><label htmlFor={name} className="text-sm font-medium">{label}</label><PasswordField id={name} name={name} autoComplete={complete} required minLength={name === "currentPassword" ? undefined : 10} maxLength={72} className={inputClass} /></div>)}</div></ActionForm>
  </div>;
}
