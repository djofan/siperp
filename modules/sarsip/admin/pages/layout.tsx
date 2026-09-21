import { redirect } from "next/navigation";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";
export default async function SarsipAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!hasModuleAccess(session, "sarsip")) redirect("/admin?error=forbidden");
  const items = [
    { href: "/admin/sarsip", label: "Dashboard SARSIP" },
    { href: "/admin/sarsip/profil", label: "Profil tim" },
    { href: "/admin/sarsip/kegiatan", label: "Kegiatan" },

    { href: "/admin/sarsip/berita", label: "Berita" },
    { href: "/admin/sarsip/campaign", label: "Campaign" },
    { href: "/admin/sarsip/transaksi", label: "Transaksi donasi" },
    { href: "/admin/sarsip/beneficiary", label: "Penerima manfaat" },
    { href: "/admin/sarsip/donatur", label: "Data donatur" },
    { href: "/sarsip", label: "Lihat situs publik ↗" },
  ];
  return <AdminShellChrome groups={[{ heading: "SARSIP", items }, { items: [{ href: "/admin", label: "Pilihan modul" }] }]} userName={session.name}>{children}</AdminShellChrome>;
}

