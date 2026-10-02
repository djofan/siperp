import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AcademyShell } from "@/modules/academy/components/AcademyShell";
import "@/modules/academy/components/academy.css";
export const metadata = { title: "Admin Academy", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAcademyAdmin();
  return <AcademyShell admin user={{ name: user.name, nis: "Admin" }}>{children}</AcademyShell>;
}
