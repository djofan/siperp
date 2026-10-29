import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleAccounts, type ManagedAccountData } from "@/components/admin-shell/ModuleAccounts";

export default async function ModuleAccountsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!session.isSuperadmin && !Object.values(session.moduleRoles ?? {}).includes("admin")) redirect("/admin");
  const data = await apiRequest<ManagedAccountData>("core/module-accounts");
  return <div><PageHeader title="Akun modul" description="Daftarkan akun operasional untuk modul yang Anda kelola. Akses admin dan penentuan modul dikelola oleh SASIP01."/><ModuleAccounts initial={data}/></div>;
}
