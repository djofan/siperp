import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
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
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/super/akun"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground"
        >
          ← Kembali ke Kelola Akun
        </Link>
        <PageHeader title={`Detail Akun — ${user.name}`} description={user.email} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Nama, email, dan password login akun ini.</CardDescription>
          </CardHeader>
          <EditAkunForm userId={user.id} initialName={user.name} initialEmail={user.email} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Akses Modul</CardTitle>
            <CardDescription>Atur modul mana saja yang boleh diakses akun ini.</CardDescription>
          </CardHeader>
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
        </Card>
      </div>

      <Card tone="danger">
        <CardHeader>
          <CardTitle className="text-danger">Zona Berbahaya</CardTitle>
          <CardDescription>Tindakan berikut tidak bisa dibatalkan.</CardDescription>
        </CardHeader>
        {isSelf ? (
          <p className="text-sm text-foreground/50">
            Tidak bisa menghapus akun yang sedang kamu pakai untuk login.
          </p>
        ) : (
          <DeleteAkunButton userId={user.id} userName={user.name} />
        )}
      </Card>
    </div>
  );
}
