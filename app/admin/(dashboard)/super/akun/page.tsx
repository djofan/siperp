import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { AkunTable } from "@/components/admin-shell/AkunTable";
import { listUsersWithAccess } from "@/modules/core/users";
import { CheckCircle2 } from "lucide-react";
import styles from "@/components/admin-shell/AccountForm.module.css";

export default async function KelolaAkunPage({ searchParams }: { searchParams: Promise<{ dibuat?: string; diubah?: string }> }) {
  const [users, query] = await Promise.all([listUsersWithAccess(), searchParams]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Akun admin modul"
        description="Buat akun admin baru dan atur modul mana saja yang boleh diakses."
        actions={
          <Link href="/admin/super/akun/baru" className={buttonVariants()}>
            Tambah admin modul
          </Link>
        }
      />
      {(query.dibuat === "1" || query.diubah === "1") && <div role="status" className={styles.notice}><CheckCircle2 size={20} />{query.dibuat === "1" ? "Akun admin berhasil dibuat. Kode login dan akses modul dapat dilihat pada daftar di bawah." : "Perubahan akun dan akses modul berhasil disimpan."}</div>}
      <AkunTable users={users.filter(user => user.isSuperadmin || /^AMSIP[0-9]+$/.test(user.code) || user.moduleAccess.some(access => access.role === "admin"))} />
    </div>
  );
}
