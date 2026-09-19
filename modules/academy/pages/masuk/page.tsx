import Link from "next/link";
import { redirect } from "next/navigation";
import { getAcademyUser, requireAcademyAvailable } from "../../api/access";
import { AcademyLoginForm } from "../../components/LoginForm";
import { PageHeading } from "../../components/ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ terdaftar?: string }> }) {
  await requireAcademyAvailable();
  if (await getAcademyUser()) redirect("/academy/belajar");
  const { terdaftar } = await searchParams;
  return <div className="mx-auto max-w-lg px-4 py-16"><PageHeading title="Selamat datang kembali.">Masuk dengan akun SIP untuk melanjutkan belajar.</PageHeading>
    {terdaftar === "1" && <p role="status" className="mb-6 rounded-xl bg-lazsip-primary-100 p-4 text-sm">Pendaftaran berhasil. Silakan masuk.</p>}
    <AcademyLoginForm /><p className="mt-6 text-sm">Belum memiliki akun? <Link href="/academy/daftar" className="font-semibold underline">Daftar di sini</Link>.</p>
  </div>;
}
