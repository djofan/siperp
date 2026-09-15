import { redirect } from "next/navigation";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { LazsipAdminShellChrome } from "@/components/lazsip/admin/LazsipAdminShellChrome";

export default async function LazsipAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!hasModuleAccess(session, "lazsip")) {
    redirect("/admin?error=forbidden");
  }

  return <LazsipAdminShellChrome userName={session.name}>{children}</LazsipAdminShellChrome>;
}
