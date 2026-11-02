import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listModules } from "@/modules/core/modules";
import { countUsers } from "@/modules/core/users";
import { CoreDashboard } from "@/components/admin-shell/CoreDashboard";

export default async function DashboardHomePage(){
  const session=await getSession();
  if(!session)redirect("/admin/login");
  const [registered,totalUsers]=await Promise.all([listModules(),session.isSuperadmin?countUsers():Promise.resolve(null)]);
  const modules=registered.filter(module=>module.isActive&&(session.isSuperadmin||session.moduleSlugs.includes(module.slug)));
  return <CoreDashboard name={session.name} isSuperadmin={session.isSuperadmin} modules={modules} totalModules={registered.length} totalUsers={totalUsers} managedModules={modules.filter(module=>session.moduleRoles?.[module.slug]==="admin").length}/>;
}
