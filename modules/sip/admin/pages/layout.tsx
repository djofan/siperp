import { redirect } from "next/navigation";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { SipAdminShellChrome } from "@/modules/sip/components/admin/SipAdminShellChrome";

export default async function SipAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!hasModuleAccess(session, "sip")) {
    redirect("/admin?error=forbidden");
  }

  return <SipAdminShellChrome userName={session.name}>{children}</SipAdminShellChrome>;
}
