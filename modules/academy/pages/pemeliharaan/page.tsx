import Link from "next/link";
import { redirect } from "next/navigation";
import { getAcademyAvailability } from "../../api/access";
import { PageHeading, linkButton } from "../../components/ui";

export default async function MaintenancePage() {
  if (await getAcademyAvailability()) redirect("/academy");
  return <div className="mx-auto max-w-2xl px-4 py-24"><PageHeading title="Kami sedang menyiapkan ruang belajar.">Zakat Academy sementara belum tersedia. Silakan kunjungi kembali nanti.</PageHeading><Link href="/lazsip/kontak" className={linkButton}>Hubungi LAZSIP</Link></div>;
}
