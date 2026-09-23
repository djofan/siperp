import { redirect } from "next/navigation";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { SarsipAdminShellChrome } from "@/modules/sarsip/components/admin/SarsipAdminShellChrome";

export default async function SarsipAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!hasModuleAccess(session, "sarsip")) {
    redirect("/admin?error=forbidden");
  }

  return <SarsipAdminShellChrome userName={session.name}>{children}</SarsipAdminShellChrome>;
}
