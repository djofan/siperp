import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleAccounts, type ManagedAccountData } from "@/components/admin-shell/ModuleAccounts";

export default async function ModuleAccountsPage({ searchParams }: { searchParams: Promise<{ modul?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!session.isSuperadmin && !Object.values(session.moduleRoles ?? {}).includes("admin")) redirect("/admin");
  const data = await apiRequest<ManagedAccountData>("core/module-accounts");
  const query = await searchParams;
  return <div><PageHeader title="Akun operasional" description="Pilih modul untuk melihat anggota, peran, dan mengelola akun operasionalnya."/><ModuleAccounts key={query.modul ?? "all"} initial={data} initialModule={query.modul}/></div>;
}
