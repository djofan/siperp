import Link from "next/link";
import { linkButton } from "../components/ui";
export default function AcademyNotFound() {
  return <div className="mx-auto max-w-2xl px-4 py-20"><h1 className="text-3xl font-bold">Konten tidak ditemukan.</h1><p className="mt-4">Konten mungkin belum dipublikasikan atau tidak tersedia untuk akun Anda.</p><Link href="/academy/program" className={`${linkButton} mt-6`}>Lihat program</Link></div>;
}
