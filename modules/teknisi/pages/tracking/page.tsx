import { redirect } from "next/navigation";
export const metadata = { title: "Cek Status Servis", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
// Keep previously shared customer links working; tracking now lives on the landing page.
export default async function Page({ searchParams }: { searchParams: Promise<{ kode?: string }> }) {
  const { kode } = await searchParams;
  const code = (kode ?? "").trim().toLowerCase();
  redirect(/^[a-f0-9]{48}$/.test(code) ? `/teknisi#cek-status?kode=${code}` : "/teknisi#cek-status");
}
