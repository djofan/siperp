import { ChangePassword } from "@/modules/core/ChangePassword";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PasswordPage(){
  const session=await getSession();
  if(!session)redirect("/admin/login?from=%2Fakun%2Fpassword");
  if(session.isSuperadmin||Object.values(session.moduleRoles??{}).includes("admin"))redirect("/admin/pengaturan-akun");
  return <main style={{width:"min(100% - 40px, 480px)",margin:"48px auto"}}><h1>Password akun</h1><p>Ubah password akun yang sedang Anda gunakan.</p><ChangePassword initiallyOpen/></main>;
}
