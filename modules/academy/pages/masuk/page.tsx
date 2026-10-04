import Link from "next/link";
import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "../../api/access";
import { AcademyLoginForm } from "../../components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ terdaftar?: string; password?: string }> }) {
  const available = await getAcademyAvailability();
  const successHref = available ? "/academy/belajar" : "/academy";
  const user = await getAcademyUser();
  if (user) redirect(user.isTeacher ? "/academy/pengajar" : successHref);
  const { terdaftar, password } = await searchParams;
  return <div className="mx-auto w-full max-w-sm"><div className="mb-8 text-center"><h1 className="text-2xl font-semibold tracking-tight">Insan Academy</h1><p className="mt-1 text-sm text-gray-500">Belajar bersama Ustadz Irham · Program 1 bulan</p></div>
    {terdaftar === "1" && <p role="status" className="mb-6 rounded-xl bg-lazsip-primary-100 p-4 text-sm">Pendaftaran berhasil. Silakan masuk.</p>}
    {password === "1" && <p role="status" className="mb-6 rounded-xl bg-green-50 p-4 text-sm">Password berhasil diubah. Masuk dengan password baru.</p>}
    <AcademyLoginForm /><p className="mt-4 text-center text-sm text-gray-500">Belum punya akun? <Link href="/academy/daftar" className="font-medium text-gray-900 underline-offset-4 hover:underline">Daftar di sini</Link></p>
  </div>;
}
