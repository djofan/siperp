import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AkunForm } from "@/components/admin-shell/AkunForm";
import { listModules } from "@/modules/core/modules";

export default async function TambahAkunPage() {
  const modules = await listModules();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/super/akun"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground"
        >
          ← Kembali ke Kelola Akun
        </Link>
        <PageHeader
          title="Tambah Akun"
          description="Buat akun admin baru dan tentukan modul yang boleh diakses."
        />
      </div>
      <AkunForm modules={modules} />
    </div>
  );
}
