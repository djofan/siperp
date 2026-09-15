import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { AkunTable } from "@/components/admin-shell/AkunTable";
import { listUsersWithAccess } from "@/modules/core/users";

export default async function KelolaAkunPage() {
  const users = await listUsersWithAccess();

  return (
    <div>
      <PageHeader
        title="Kelola Akun"
        description="Buat akun admin baru dan atur modul mana saja yang boleh diakses."
        actions={
          <Link href="/admin/super/akun/baru" className={buttonVariants()}>
            Tambah Akun
          </Link>
        }
      />
      <AkunTable users={users} />
    </div>
  );
}
