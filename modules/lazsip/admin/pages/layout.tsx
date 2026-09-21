import { redirect } from "next/navigation";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { LazsipAdminShellChrome } from "@/modules/lazsip/components/admin/LazsipAdminShellChrome";
import { getDashboardCounts } from "@/modules/lazsip/api/dashboard";

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

  const { pendingTransactions } = await getDashboardCounts();

  return (
    <LazsipAdminShellChrome userName={session.name} pendingTransactionsCount={pendingTransactions}>
      {children}
    </LazsipAdminShellChrome>
  );
}
