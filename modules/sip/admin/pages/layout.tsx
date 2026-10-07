import { requireSipAdmin } from "@/modules/sip/api/admin-access";
import { SipAdminShellChrome } from "@/modules/sip/components/admin/SipAdminShellChrome";

export default async function SipAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSipAdmin();
  return <SipAdminShellChrome userName={user.name}>{children}</SipAdminShellChrome>;
}
