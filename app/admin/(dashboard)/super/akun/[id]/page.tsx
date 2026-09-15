import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AksesForm } from "@/components/admin-shell/AksesForm";
import { EditAkunForm } from "@/components/admin-shell/EditAkunForm";
import { DeleteAkunButton } from "@/components/admin-shell/DeleteAkunButton";
import { getUserWithAccess } from "@/modules/core/users";
import { listModules } from "@/modules/core/modules";
import { getSession } from "@/lib/auth";

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
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/super/akun"
          className="mb-4 inline-block text-sm text-foreground/50 hover:text-foreground"
        >
          ← Kembali ke Kelola Akun
        </Link>
        <PageHeader title={`Detail Akun — ${user.name}`} description={user.email} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-foreground/60">Informasi Akun</h2>
        <EditAkunForm userId={user.id} initialName={user.name} initialEmail={user.email} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-foreground/60">Akses Modul</h2>
        {user.isSuperadmin ? (
          <p className="text-sm text-foreground/50">
            Akun ini superadmin, otomatis punya akses ke semua modul.
          </p>
        ) : (
          <AksesForm
            userId={user.id}
            modules={modules}
            initialAccess={user.moduleAccess.map((access) => ({
              moduleId: access.module.id,
              role: access.role,
            }))}
          />
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 className="text-sm font-medium text-danger">Zona Berbahaya</h2>
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
