import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EditAkunForm } from "@/components/admin-shell/EditAkunForm";
import { DeleteAkunButton } from "@/components/admin-shell/DeleteAkunButton";
import { getUserWithAccess } from "@/modules/core/users";
import { listModules } from "@/modules/core/modules";
import { getSession } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import styles from "@/components/admin-shell/AccountForm.module.css";

export default async function DetailAkunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, modules, session] = await Promise.all([
    getUserWithAccess(id),
    listModules(),
    getSession(),
  ]);

  if (!user) {
    notFound();
  }

  const isSelf = session?.userId === user.id;

  return (
    <div className={styles.page}>
      <div>
        <Link
          href="/admin/super/akun"
          className={styles.back}
        >
          <ArrowLeft size={15} /> Kembali ke Kelola Akun
        </Link>
        <PageHeader title="Kelola akun" description={`${user.name} · ${user.code}`} />
      </div>

      <EditAkunForm modules={modules} account={{ id: user.id, name: user.name, code: user.code, isSuperadmin: user.isSuperadmin,
        access: user.moduleAccess.map(access => ({ moduleId: access.module.id, role: access.role })) }} />
      <section className={styles.danger}>
        <div><h2>Hapus akun</h2><p>Hapus akun beserta aksesnya. Tindakan ini tidak dapat dibatalkan.</p></div>
        {isSelf ? (
          <p className="text-sm text-foreground/50">
            Tidak bisa menghapus akun yang sedang kamu pakai untuk login.
          </p>
        ) : (
          <DeleteAkunButton userId={user.id} userName={user.name} />
        )}
      </section>
    </div>
  );
}
